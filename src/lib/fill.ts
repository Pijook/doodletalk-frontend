// Iterative flood fill: bounded by the bitmap size, with no recursive stack growth.
export function floodFill(image: ImageData, x: number, y: number, hex: string): boolean {
  const { width, height, data } = image
  x = Math.floor(x)
  y = Math.floor(y)
  if (x < 0 || y < 0 || x >= width || y >= height) return false
  const start = y * width + x
  const source = Array.from(data.slice(start * 4, start * 4 + 4))
  const target = [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255,
  ]
  if (source.every((v, i) => v === target[i])) return false
  const stack = [start]
  const matches = (p: number) => source.every((v, i) => data[p * 4 + i] === v)
  const paint = (p: number) => {
    if (!matches(p)) return
    data.set(target, p * 4)
    stack.push(p)
  }
  data.set(target, start * 4)
  while (stack.length) {
    const p = stack.pop()!
    if (p % width > 0) paint(p - 1)
    if (p % width < width - 1) paint(p + 1)
    if (p >= width) paint(p - width)
    if (p < width * (height - 1)) paint(p + width)
  }
  return true
}
