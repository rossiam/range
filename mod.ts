/**
 * A small, lazy, immutable numeric range.
 *
 * {@link range} produces an iterable you can spread, loop over, or
 * {@link Mappable.map | map}, with inclusive or exclusive boundaries,
 * fractional and negative steps, and a configurable tolerance to work
 * around floating-point rounding errors.
 *
 * ```ts
 * import { assertEquals } from 'jsr:@std/assert/equals'
 *
 * assertEquals([...range(0, 5)], [0, 1, 2, 3, 4])
 * assertEquals([...range(1, 5, { endInclusive: true })], [1, 2, 3, 4, 5])
 * assertEquals([...range(5, 0, { step: -1 })], [5, 4, 3, 2, 1])
 * ```
 *
 * @module
 */

/**
 * Optional stuff that can be specified when creating a range.
 */
export type RangeOptions = {
	/**
	 * The distance between consecutive values. May be fractional, and may be
	 * negative to count down from `start`. Must be finite and non-zero.
	 *
	 * ```ts
	 * import { assertEquals } from 'jsr:@std/assert/equals'
	 *
	 * assertEquals([...range(0, 10, { step: 2 })], [0, 2, 4, 6, 8])
	 * assertEquals([...range(0, 1, { step: 0.25 })], [0, 0.25, 0.5, 0.75])
	 * assertEquals([...range(5, 0, { step: -1 })], [5, 4, 3, 2, 1])
	 * ```
	 *
	 * @default {1}
	 */
	readonly step?: number

	/**
	 * Whether `start` itself is produced.
	 *
	 * @default {true}
	 */
	readonly startInclusive?: boolean

	/**
	 * Whether a value landing exactly on `end` is produced.
	 *
	 * @default {false}
	 */
	readonly endInclusive?: boolean

	/**
	 * Since JavaScript has rounding errors, this can be used to specify
	 * the minimum difference between two numbers considered "equal".
	 * This value must be finite and cannot be negative.
	 *
	 * Stepping by a fraction accumulates error, which can drop the last element
	 * of a range or invent one past the end. This tolerance decides how close to
	 * `end` a value has to be before it counts as landing on it.
	 *
	 * ```ts
	 * import { assertEquals } from 'jsr:@std/assert/equals'
	 *
	 * // (0.3 - 0) / 0.1 is 2.9999999999999996, not 3, so the end would be missed
	 * assertEquals(
	 * 	[...range(0, 0.3, { step: 0.1, endInclusive: true })],
	 * 	[0, 0.1, 0.2, 0.30000000000000004],
	 * )
	 *
	 * // set it to 0 to opt out and take the raw arithmetic
	 * assertEquals(
	 * 	[...range(0, 0.3, { step: 0.1, endInclusive: true, minDifferenceConsideredEqual: 0 })],
	 * 	[0, 0.1, 0.2],
	 * )
	 * ```
	 *
	 * It is measured in values rather than in steps, and the sign of the step
	 * does not matter. Keep it well below the step size: if it exceeds the step,
	 * neighboring values count as equal to each other, messing up terminating values.
	 *
	 * @default {1e-9}
	 */
	readonly minDifferenceConsideredEqual?: number
}

/**
 * A lazy, reusable iterable that can be mapped again. Mapping does no work
 * until the result is iterated, and iterating it more than once re-runs the
 * mapping, so a mapped value is as reusable as the range it came from.
 *
 * Frozen, like the {@link Range} it came from.
 */
export type Mappable<T> =
	& {
		/**
		 * Transform every value as it is produced.
		 *
		 * Nothing runs until the result is iterated, so mapping a large or
		 * unbounded range costs nothing until it is consumed, and `fn` is never
		 * called for a range that turns out to be empty. The result can be
		 * mapped again.
		 *
		 * ```ts
		 * import { assertEquals } from 'jsr:@std/assert/equals'
		 *
		 * assertEquals([...range(1, 4).map((num) => num * num)], [1, 4, 9])
		 *
		 * const labels = range(1, 4).map((num) => num * num).map((num) => `#${num}`)
		 *
		 * assertEquals([...labels], ['#1', '#4', '#9'])
		 * assertEquals([...labels], ['#1', '#4', '#9']) // reusable
		 * ```
		 *
		 * @param fn called with each value in turn
		 * @returns a lazy, reusable, frozen iterable of the results
		 */
		map<U>(fn: (value: T) => U): Mappable<U>
	}
	& Iterable<T>

/**
 * A range of numbers. Create one with {@link range}.
 *
 * Frozen and reusable: iterating a range does not consume it, and every
 * resolved option is readable as a property.
 *
 * ```ts
 * import { assertEquals } from 'jsr:@std/assert/equals'
 *
 * const indexes = range(3, 6)
 *
 * assertEquals([...indexes], [3, 4, 5])
 * assertEquals([...indexes], [3, 4, 5]) // iterating does not consume it
 * assertEquals(Object.isFrozen(indexes), true)
 * ```
 *
 * @see {@link range}
 */
export type Range =
	& {
		/** The value the range counts from, as given to {@link range}. */
		readonly start: number

		/** The value the range counts toward, as given to {@link range}. */
		readonly end: number

		/**
		 * Render the range as `start`, `step`, and `end` separated by colons,
		 * with each boundary marked `I` when inclusive and `E` when exclusive.
		 *
		 * ```ts
		 * import { assertEquals } from 'jsr:@std/assert/equals'
		 *
		 * assertEquals(`${range(3, 6)}`, '3I:1:6E')
		 * assertEquals(`${range(3, 6, { startInclusive: false, endInclusive: true })}`, '3E:1:6I')
		 * assertEquals(`${range(6, 3, { step: -1 })}`, '6I:-1:3E')
		 * ```
		 */
		toString(): string
	}
	& Required<RangeOptions>
	& Mappable<number>

/** Wrap a generator function so each mapped value is lazy, reusable, and frozen. */
const mappable = <T>(iterate: () => Generator<T>): Mappable<T> =>
	Object.freeze({
		[Symbol.iterator]: iterate,
		map: <U>(fn: (value: T) => U): Mappable<U> =>
			mappable(function* (): Generator<U> {
				for (const value of iterate()) {
					yield fn(value)
				}
			}),
	})

/**
 * Generate a range.
 *
 * The start is included and the end excluded by default, matching `Array`
 * indexing and most `for` loops. Either boundary can be flipped independently
 * with {@link RangeOptions.startInclusive} and {@link RangeOptions.endInclusive}.
 *
 * # Examples
 *
 * ```ts
 * import { assertEquals } from "jsr:@std/assert/equals"
 *
 * const indexes = range(3, 6)
 *
 * assertEquals(indexes.start, 3)
 * assertEquals(indexes.startInclusive, true)
 * assertEquals(indexes.end, 6)
 * assertEquals(indexes.endInclusive, false)
 * assertEquals(indexes.step, 1)
 * ```
 *
 * A range that can never reach its end is empty rather than an error, so an
 * empty result always means the range is genuinely empty:
 *
 * ```ts
 * import { assertEquals } from "jsr:@std/assert/equals"
 *
 * assertEquals([...range(0, 5, { step: -1 })], []) // stepping away from the end
 * assertEquals([...range(10, 1)], []) // end is behind the start
 * assertEquals([...range(0, 3, { step: 10 })], [0]) // one step overshoots
 * ```
 *
 * Because ranges are lazy, an unbounded end is usable as long as iteration is
 * stopped. Don't try to make an array out of one, though:
 *
 * ```ts
 * import { assertEquals } from "jsr:@std/assert/equals"
 *
 * const evens: number[] = []
 * for (const num of range(0, Infinity, { step: 2 })) {
 * 	if (num > 10) break
 * 	evens.push(num)
 * }
 *
 * assertEquals(evens, [0, 2, 4, 6, 8, 10])
 * ```
 *
 * @param start start index; must be finite
 * @param end end index; may be Infinity or -Infinity for an unbounded range
 * @param options less-common options
 * @returns an iterable range
 * @throws {RangeError} `step must be non-zero`, when `step` is `0`
 * @throws {RangeError} `step must be finite`, when `step` is `NaN` or infinite
 * @throws {RangeError} `start must be finite`, when `start` is `NaN` or infinite
 * @throws {RangeError} `end cannot be NaN`, when `end` is `NaN`
 * @throws {RangeError} `minDifferenceConsideredEqual cannot be negative`
 * @throws {RangeError} `minDifferenceConsideredEqual must be finite`, when it is `NaN` or infinite
 */
export const range = (
	start: number,
	end: number,
	options?: RangeOptions,
): Range => {
	const opts = {
		step: options?.step ?? 1,
		startInclusive: options?.startInclusive ?? true,
		endInclusive: options?.endInclusive ?? false,
		minDifferenceConsideredEqual: options?.minDifferenceConsideredEqual ?? 1e-9,
	}
	const step = opts.step
	if (!Number.isFinite(start)) {
		throw new RangeError('start must be finite')
	}
	if (Number.isNaN(end)) {
		throw new RangeError('end cannot be NaN')
	}
	if (!Number.isFinite(step)) {
		throw new RangeError('step must be finite')
	}
	if (step === 0) {
		throw new RangeError('step must be non-zero')
	}
	if (!Number.isFinite(opts.minDifferenceConsideredEqual)) {
		throw new RangeError('minDifferenceConsideredEqual must be finite')
	}
	if (opts.minDifferenceConsideredEqual < 0) {
		throw new RangeError('minDifferenceConsideredEqual cannot be negative')
	}
	const startInclusive = opts.startInclusive
	const endInclusive = opts.endInclusive
	const firstIndex = startInclusive ? 0 : 1
	const ratio = (end - start) / step
	const lastIndex = endInclusive
		? Math.floor(ratio + opts.minDifferenceConsideredEqual / Math.abs(step))
		: Math.ceil(ratio - opts.minDifferenceConsideredEqual / Math.abs(step)) - 1
	const iterate = function* (): Generator<number> {
		for (let index = firstIndex; index <= lastIndex; index++) {
			yield start + index * step
		}
	}
	return Object.freeze({
		start,
		end,
		...opts,
		[Symbol.iterator]: iterate,
		map: <U>(fn: (value: number) => U): Mappable<U> => mappable(iterate).map(fn),
		toString: (): string =>
			`${start}${startInclusive ? 'I' : 'E'}:${step}:${end}${endInclusive ? 'I' : 'E'}`,
	})
}
