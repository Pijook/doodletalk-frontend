import { expect, it } from 'vitest'
import { floodFill } from './fill'
it('fills only the connected region and leaves borders and separate areas intact', () => {
  const data = new Uint8ClampedArray([
    255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255,
    255, 255, 255,
  ])
  const image = { width: 3, height: 2, data } as ImageData
  expect(floodFill(image, 0, 0, '#ff0000')).toBe(true)
  expect(Array.from(data.slice(0, 4))).toEqual([255, 0, 0, 255])
  expect(Array.from(data.slice(12, 16))).toEqual([255, 0, 0, 255])
  expect(Array.from(data.slice(4, 12))).toEqual([0, 0, 0, 255, 255, 255, 255, 255])
  expect(floodFill(image, 0, 0, '#ff0000')).toBe(false)
  expect(floodFill(image, 3, 0, '#000000')).toBe(false)
})
it('handles a full canvas without recursive stack overflow', () => {
  const image = {
    width: 1000,
    height: 700,
    data: new Uint8ClampedArray(1000 * 700 * 4).fill(255),
  } as ImageData
  expect(floodFill(image, 500, 350, '#123456')).toBe(true)
  expect(Array.from(image.data.slice(-4))).toEqual([18, 52, 86, 255])
})
