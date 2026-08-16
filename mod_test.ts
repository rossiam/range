import { assert } from '@std/assert/assert'
import { assertEquals } from '@std/assert/equals'
import { assertThrows } from '@std/assert/throws'

import { range } from './mod.ts'


Deno.test('correct defaults', () => {
	const indexes = range(3, 6)

	assertEquals(indexes.start, 3)
	assertEquals(indexes.startInclusive, true)
	assertEquals(indexes.end, 6)
	assertEquals(indexes.endInclusive, false)
	assertEquals(indexes.step, 1)
	assertEquals(indexes.minDifferenceConsideredEqual, 1e-9)

	assertEquals([...indexes], [3, 4, 5])
})

Deno.test('range is reusable', () => {
	const indexes = range(3, 6)

	assertEquals([...indexes], [3, 4, 5])
	assertEquals([...indexes], [3, 4, 5])
})

Deno.test('non-default values shine through', () => {
	const indexes = range(
		3,
		6,
		{
			step: 1.1,
			startInclusive: false,
			endInclusive: true,
			minDifferenceConsideredEqual: 0.0001,
		},
	)

	assertEquals(indexes.start, 3)
	assertEquals(indexes.startInclusive, false)
	assertEquals(indexes.end, 6)
	assertEquals(indexes.endInclusive, true)
	assertEquals(indexes.step, 1.1)
	assertEquals(indexes.minDifferenceConsideredEqual, 0.0001)

	assertEquals([...indexes], [4.1, 5.2])
})

Deno.test('inclusive end', () => {
	const indexes = range(3, 6, { endInclusive: true })

	assertEquals(indexes.endInclusive, true)

	assertEquals([...indexes], [3, 4, 5, 6])
})

Deno.test('exclusive start', () => {
	const indexes = range(3, 6, { startInclusive: false })

	assertEquals(indexes.startInclusive, false)

	assertEquals([...indexes], [4, 5])
})

Deno.test('fractional step', () => {
	const indexes = range(3, 4, { step: 0.1 })

	assertEquals(indexes.step, 0.1)

	assertEquals([...indexes], [3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9])
})

Deno.test('step backwards', () => {
	const indexes = range(6, 3, { step: -1 })

	assertEquals([...indexes], [6, 5, 4])
})

Deno.test('disallow 0 step', () => {
	assertThrows(
		() => range(1, 10, { step: 0 }),
		RangeError,
	)
})

Deno.test('end before start', () => {
	const indexes = range(10, 1)

	assertEquals([...indexes], [])
})

Deno.test('end after start with a negative step', () => {
	const indexes = range(1, 2, { step: -0.1 })

	assertEquals([...indexes], [])
})

Deno.test('infinite end is empty if stepping away from it', () => {
	assertEquals([...range(3, -Infinity)], [])
	assertEquals([...range(3, Infinity, { step: -1 })], [])
})

Deno.test('toString', () => {
	const indexes = range(3, 6)

	assertEquals(`${indexes}`, '3I:1:6E')
})

Deno.test('toString, non-default exclusivity', () => {
	const indexes = range(3, 6, { startInclusive: false, endInclusive: true })

	assertEquals(`${indexes}`, '3E:1:6I')
})

Deno.test('is mappable', () => {
	const indexes = range(3, 6).map((index) => index * 2)

	assertEquals([...indexes], [6, 8, 10])
})

Deno.test('mapped range is reusable', () => {
	const indexes = range(3, 6).map((index) => index * 2)

	assertEquals([...indexes], [6, 8, 10])
	assertEquals([...indexes], [6, 8, 10])
})

Deno.test('mapped range is mappable', () => {
	const indexes = range(3, 6)
		.map((index) => index * 2)
		.map((index) => `#${index}`)

	assertEquals([...indexes], ['#6', '#8', '#10'])
})

Deno.test('mapped range is frozen', () => {
	const indexes = range(3, 6).map((index) => index * 2)

	assert(Object.isFrozen(indexes))
	assert(Object.isFrozen(indexes.map((index) => index)))
})

Deno.test('mapping is lazy', () => {
	let calls = 0
	const indexes = range(3, 6).map((index) => {
		calls++
		return index
	})

	assertEquals(calls, 0)

	assertEquals([...indexes], [3, 4, 5])
	assertEquals(calls, 3)
})

Deno.test('mapping an empty range never calls the function', () => {
	const indexes = range(3, 3).map(() => {
		throw new Error('should not be called')
	})

	assertEquals([...indexes], [])
})

Deno.test('minDifferenceConsideredEqual keeps an inclusive end lost to rounding error', () => {
	// (0.3 - 0) / 0.1 is 2.9999999999999996, not 3
	const indexes = range(0, 0.3, { step: 0.1, endInclusive: true })

	assertEquals([...indexes], [0, 0.1, 0.2, 0.30000000000000004])
})

Deno.test('minDifferenceConsideredEqual drops an exclusive end reached by rounding error', () => {
	// (2.1 - 0) / 0.7 is 3.0000000000000004, not 3
	const indexes = range(0, 2.1, { step: 0.7 })

	assertEquals([...indexes], [0, 0.7, 1.4])
})

Deno.test('minDifferenceConsideredEqual of 0 leaves rounding errors alone', () => {
	assertEquals(
		[...range(0, 0.3, { step: 0.1, endInclusive: true, minDifferenceConsideredEqual: 0 })],
		[0, 0.1, 0.2],
	)
	assertEquals(
		[...range(0, 2.1, { step: 0.7, minDifferenceConsideredEqual: 0 })],
		[0, 0.7, 1.4, 2.0999999999999996],
	)
})

Deno.test('minDifferenceConsideredEqual is measured in values, not steps', () => {
	// 6 is one past the end, but within one of it, so it counts as the end
	const indexes = range(0, 5, { step: 2, endInclusive: true, minDifferenceConsideredEqual: 1 })

	assertEquals([...indexes], [0, 2, 4, 6])

	assertEquals([...range(0, 5, { step: 2, endInclusive: true })], [0, 2, 4])
})

Deno.test('minDifferenceConsideredEqual ignores the sign of the step', () => {
	const indexes = range(0, -5, { step: -2, endInclusive: true, minDifferenceConsideredEqual: 1 })

	assertEquals([...indexes], [0, -2, -4, -6])

	assertEquals([...range(0, -5, { step: -2, endInclusive: true })], [0, -2, -4])
})

Deno.test('forcibly undefined values still get defaults', () => {
	const indexes = range(
		3,
		6,
		{
			step: undefined,
			startInclusive: undefined,
			endInclusive: undefined,
			minDifferenceConsideredEqual: undefined,
		},
	)

	assertEquals([...indexes], [3, 4, 5])
})

Deno.test('minDifferenceConsideredEqual must be finite and positive', () => {
	assertThrows(() => range(1, 10, { minDifferenceConsideredEqual: -1 }), RangeError)
	assertThrows(() => range(1, 10, { minDifferenceConsideredEqual: NaN }), RangeError)
	assertThrows(() => range(1, 10, { minDifferenceConsideredEqual: Infinity }), RangeError)
})

Deno.test('step must be finite', () => {
	assertThrows(() => range(1, 10, { step: NaN }), RangeError)
	assertThrows(() => range(1, 10, { step: Infinity }), RangeError)
	assertThrows(() => range(1, 10, { step: -Infinity }), RangeError)
})

Deno.test('start must be finite', () => {
	assertThrows(() => range(NaN, 10), RangeError)
	assertThrows(() => range(Infinity, 10), RangeError)
	assertThrows(() => range(-Infinity, 10), RangeError)
})

Deno.test('end cannot be NaN', () => {
	assertThrows(() => range(1, NaN), RangeError)
})

Deno.test('an infinite end makes an unbounded range', () => {
	const indexes = range(3, Infinity)
	const first: number[] = []
	for (const index of indexes) {
		first.push(index)
		if (first.length === 4) {
			break
		}
	}

	assertEquals(first, [3, 4, 5, 6])
})

Deno.test('range is frozen', () => {
	const indexes = range(3, 6)

	assert(Object.isFrozen(indexes))
})

Deno.test('range rejects mutation', () => {
	const indexes = range(3, 6)
	const mutable = indexes as { start: number; step: number }

	assertThrows(() => mutable.start = 100, TypeError)
	assertThrows(() => mutable.step = 2, TypeError)

	assertEquals([...indexes], [3, 4, 5])
})
