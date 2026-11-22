"""Privacy zone for test walks: cut the start and end of a track, so a walk that
begins and ends at home doesn't show where home is.

Around the first and the last point a circle is removed. Its centre is moved by up to
300 m in a random direction and its radius is 500-900 m, both drawn per activity (seeded
by the activity id, so a re-run gives the same cut). With many walks from the same door,
the cut ends then scatter instead of lining up on a circle around the house.
No home address is stored anywhere.
"""
import math, random

def _dist(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))

def _zone(rng, lat, lon, fuzz=300.0, rmin=500.0, rmax=900.0):
    b, d = rng.uniform(0, 2 * math.pi), rng.uniform(0, fuzz)
    clat = lat + (d * math.cos(b)) / 111320.0
    clon = lon + (d * math.sin(b)) / (111320.0 * math.cos(math.radians(lat)))
    return clat, clon, rng.uniform(rmin, rmax)

def trim(coords, times, seed):
    """coords: [[lon, lat], ...]; times: seconds since the first point or None.
    Returns (coords, times, first_index) or None if nothing is left."""
    if len(coords) < 2:
        return None
    rng = random.Random(str(seed))
    a = _zone(rng, coords[0][1], coords[0][0])
    b = _zone(rng, coords[-1][1], coords[-1][0])
    i, j = 0, len(coords) - 1
    while i <= j and _dist(coords[i][1], coords[i][0], a[0], a[1]) < a[2]:
        i += 1
    while j >= i and _dist(coords[j][1], coords[j][0], b[0], b[1]) < b[2]:
        j -= 1
    if j - i < 1:
        return None
    c = coords[i:j + 1]
    t = [x - times[i] for x in times[i:j + 1]] if times else None
    return c, t, i
