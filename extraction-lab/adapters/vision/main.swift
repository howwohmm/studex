// Apple Vision RecognizeDocumentsRequest -> timetable intermediate representation.
// Emits cells with rowRange/columnRange (real rowspan/colspan) + bounding boxes.
import Foundation
import Vision

struct CellOut: Codable {
    let rowStart: Int
    let rowEnd: Int
    let colStart: Int
    let colEnd: Int
    let rowSpan: Int
    let colSpan: Int
    let text: String
    let bbox: [Double]
}

struct TableOut: Codable {
    let rowCount: Int
    let columnCount: Int
    let bbox: [Double]
    let cells: [CellOut]
}

struct DocOut: Codable {
    let source: String
    let tableCount: Int
    let tables: [TableOut]
    let fullText: String
    let elapsedSeconds: Double
}

func rect(_ region: NormalizedRegion) -> [Double] {
    let r = region.boundingBox
    return [Double(r.origin.x), Double(r.origin.y),
            Double(r.origin.x + r.width), Double(r.origin.y + r.height)]
}

let args = CommandLine.arguments
guard args.count > 1 else {
    FileHandle.standardError.write("usage: visiontt <image> [more...]\n".data(using: .utf8)!)
    exit(2)
}

for path in args.dropFirst() {
    let url = URL(fileURLWithPath: path)
    let t0 = Date()
    let request = RecognizeDocumentsRequest()
    let observations = try await request.perform(on: url)
    let elapsed = Date().timeIntervalSince(t0)

    var tablesOut: [TableOut] = []
    var allText = ""

    for obs in observations {
        let doc = obs.document
        allText += doc.text.transcript + "\n"
        for table in doc.tables {
            var cells: [CellOut] = []
            var seen = Set<String>()
            for row in table.rows {
                for cell in row {
                    let rr = cell.rowRange
                    let cr = cell.columnRange
                    // rows[] repeats a merged cell in each row it spans; keep one copy
                    let key = "\(rr.lowerBound)-\(rr.upperBound)-\(cr.lowerBound)-\(cr.upperBound)"
                    if seen.contains(key) { continue }
                    seen.insert(key)
                    cells.append(CellOut(
                        rowStart: rr.lowerBound,
                        rowEnd: rr.upperBound,
                        colStart: cr.lowerBound,
                        colEnd: cr.upperBound,
                        rowSpan: rr.upperBound - rr.lowerBound + 1,
                        colSpan: cr.upperBound - cr.lowerBound + 1,
                        text: cell.content.text.transcript
                            .trimmingCharacters(in: .whitespacesAndNewlines)
                            .replacingOccurrences(of: "\n", with: " | "),
                        bbox: rect(cell.content.boundingRegion)
                    ))
                }
            }
            tablesOut.append(TableOut(
                rowCount: table.rows.count,
                columnCount: table.columns.count,
                bbox: rect(table.boundingRegion),
                cells: cells
            ))
        }
    }

    let out = DocOut(
        source: url.lastPathComponent,
        tableCount: tablesOut.count,
        tables: tablesOut,
        fullText: allText,
        elapsedSeconds: elapsed
    )
    let enc = JSONEncoder()
    enc.outputFormatting = [.prettyPrinted, .sortedKeys]
    let dest = URL(fileURLWithPath: "out/\(url.deletingPathExtension().lastPathComponent).vision.json")
    try enc.encode(out).write(to: dest)
    let cellCount = tablesOut.reduce(0) { $0 + $1.cells.count }
    FileHandle.standardError.write(
        "wrote \(dest.lastPathComponent) — \(tablesOut.count) table(s), \(cellCount) cells, \(String(format: "%.2f", elapsed))s\n"
            .data(using: .utf8)!)
}
