import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimetable } from './timetable-parser.js';

const lesson = (day, start, end, subject, room = null) => ({ day, start, end, subject, room });

test('CSV headers in any order, quoted commas and escaped quotes', () => {
  assert.deepEqual(parseTimetable('VENUE,Course,END,Day,START\n"Lab, A","Math, \"\"Advanced\"\"",10:00,Monday,9:00'), [
    lesson(1, '09:00', '10:00', 'Math, "Advanced"', 'Lab, A'),
  ]);
});

test('headerless CSV, optional and blank rooms, CRLF and BOM', () => {
  assert.deepEqual(parseTimetable('\uFEFFSun,1400,1530, CS201 ,LH-2\r\nSat,9.00,10.00,Physics\r\nFri,10:00,11:00,English,'), [
    lesson(0, '14:00', '15:30', 'CS201', 'LH-2'),
    lesson(6, '09:00', '10:00', 'Physics'),
    lesson(5, '10:00', '11:00', 'English'),
  ]);
});

test('weekly lines and range separators', () => {
  assert.deepEqual(parseTimetable('Monday 09:00-10:00 Data Structures Room 101\nMon 9:00 - 10:00 | CS201 | LH-2\nTue 10.00–11.00 Art\nWed 11:00—12:00 Music\nThu 1400 to 1500 Biology'), [
    lesson(1, '09:00', '10:00', 'Data Structures', '101'),
    lesson(1, '09:00', '10:00', 'CS201', 'LH-2'),
    lesson(2, '10:00', '11:00', 'Art'),
    lesson(3, '11:00', '12:00', 'Music'),
    lesson(4, '14:00', '15:00', 'Biology'),
  ]);
});

test('PDF whitespace, ignored headers, day headings and parenthesized rooms', () => {
  assert.deepEqual(parseTimetable('UNIVERSITY WEEKLY TIMETABLE\n\n Monday \n\t9:00-10:00   Physics (Room 12)\nPage 2 of 3\n10:00 - 11:00\tChemistry\nTuesday:\n  14:00–15:00 Maths  Room 4'), [
    lesson(1, '09:00', '10:00', 'Physics', '12'),
    lesson(1, '10:00', '11:00', 'Chemistry'),
    lesson(2, '14:00', '15:00', 'Maths', '4'),
  ]);
});

test('day aliases are case insensitive and Sunday is zero', () => {
  const names = [['Sunday', 'SUN'], ['Monday', 'Mon'], ['Tuesday', 'Tue', 'Tues'], ['Wednesday', 'Wed', 'Weds'], ['Thursday', 'Thu', 'Thur', 'Thurs'], ['Friday', 'Fri'], ['Saturday', 'Sat']];
  names.forEach((aliases, day) => {
    for (const name of aliases) assert.deepEqual(parseTimetable(`${name} 9:00-10:00 CS`), [lesson(day, '09:00', '10:00', 'CS')]);
  });
});

test('12-hour conversion and no inferred meridiem', () => {
  assert.deepEqual(parseTimetable('Mon 12:00am-1:00 AM Night\nTue 12:00 PM-2:30pm Lunch\nWed 9:00 AM-10:00 am Math\nThu 1:00-2:00 Early'), [
    lesson(1, '00:00', '01:00', 'Night'), lesson(2, '12:00', '14:30', 'Lunch'),
    lesson(3, '09:00', '10:00', 'Math'), lesson(4, '01:00', '02:00', 'Early'),
  ]);
});

test('malformed times, invalid days and missing subjects are skipped', () => {
  for (const time of ['25:00', '9:75', 'garbage', '13:00pm', '0am', '2400', '1260', '9:0', '-1:00', '9:000', '9:00xyz']) {
    assert.deepEqual(parseTimetable(`Mon,${time},23:59,Math`), [], time);
    assert.deepEqual(parseTimetable(`Mon ${time}-23:59 Math`), [], time);
    assert.deepEqual(parseTimetable(`Mon 00:00-${time} Math`), [], time);
  }
  assert.deepEqual(parseTimetable('Funday 9:00-10:00 Math\nMon 9:00-10:00\n9:00-10:00 No day\nMon,9:00,10:00,,'), []);
});

test('equal, reversed and overnight ranges are rejected', () => {
  for (const [start, end] of [['10:00', '10:00'], ['11:00', '10:00'], ['23:00', '01:00'], ['9:00', '2:00']]) {
    assert.deepEqual(parseTimetable(`Mon ${start}-${end} Math`), []);
    assert.deepEqual(parseTimetable(`Mon,${start},${end},Math`), []);
  }
});

test('empty and non-string input, noise, incomplete CSV', () => {
  for (const value of ['', ' \n\t', null, undefined, 42, {}, [], 'Weekly timetable\nPage 1', 'day,start,end,subject,room', 'Mon,"9:00,10:00,Math']) {
    assert.deepEqual(parseTimetable(value), []);
  }
});
