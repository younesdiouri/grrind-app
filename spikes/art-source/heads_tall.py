"""Measure how many heads tall a front T-pose figure is (barrier G1 of grrind-character-art).

The background is the colour of the top-left pixel. The head ends at the narrowest row (the
neck) between the widest row of the head and the arm line. Run with the system Python:

    python3 -I spikes/art-source/heads_tall.py <image.png>
"""
import pathlib
import struct
import subprocess
import sys
import tempfile


def pixels(path):
    # sips (macOS) converts to an uncompressed BMP that the stdlib can read.
    with tempfile.TemporaryDirectory() as folder:
        bmp = pathlib.Path(folder) / "image.bmp"
        subprocess.run(["sips", "-s", "format", "bmp", str(path), "--out", str(bmp)],
                       check=True, capture_output=True)
        data = bmp.read_bytes()
    offset, = struct.unpack_from("<I", data, 10)
    width, height, _, bits = struct.unpack_from("<iiHH", data, 18)
    step = bits // 8
    stride = (width * step + 3) & ~3
    rows = []
    for y in range(abs(height)):
        row = y if height < 0 else abs(height) - 1 - y
        base = offset + row * stride
        rows.append([data[base + x * step: base + x * step + 3] for x in range(width)])
    return rows


def heads_tall(path, tolerance=40):
    rows = pixels(path)
    background = rows[0][0]

    def subject(p):
        return sum(abs(a - b) for a, b in zip(p, background)) > tolerance

    widths = [sum(map(subject, row)) for row in rows]
    filled = [y for y, w in enumerate(widths) if w > 3]
    top, bottom = filled[0], filled[-1]
    # The arms of a T-pose make the widest rows: the head and neck sit above the first of them.
    arms = next(y for y in filled if widths[y] > .5 * max(widths))
    shoulders = arms
    widest = max(range(top, shoulders), key=lambda y: widths[y])
    neck = min(range(widest, shoulders), key=lambda y: widths[y])
    head = neck - top
    return (bottom - top) / head, head, bottom - top


if __name__ == "__main__":
    ratio, head, total = heads_tall(sys.argv[1])
    print(f"{ratio:.2f} heads tall (head {head}px, figure {total}px)")
