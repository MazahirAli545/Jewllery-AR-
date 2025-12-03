import json, math, struct, base64, os

def write_gltf(path, vertices, normals, indices, color):
    pos_bytes = struct.pack('<%sf' % len(vertices), *vertices)
    norm_bytes = struct.pack('<%sf' % len(normals), *normals)
    idx_bytes = struct.pack('<%sH' % len(indices), *indices)

    def make_view(byte_offset, buffer, target):
        return {
            "buffer": 0,
            "byteOffset": byte_offset,
            "byteLength": len(buffer),
            "target": target
        }

    byte_offset = 0
    buffer_views = []
    buffer_views.append(make_view(byte_offset, pos_bytes, 34962)); byte_offset += len(pos_bytes)
    buffer_views.append(make_view(byte_offset, norm_bytes, 34962)); byte_offset += len(norm_bytes)
    buffer_views.append(make_view(byte_offset, idx_bytes, 34963)); byte_offset += len(idx_bytes)

    accessors = [
        {
            "bufferView": 0,
            "componentType": 5126,
            "count": len(vertices) // 3,
            "type": "VEC3",
            "min": [min(vertices[0::3]), min(vertices[1::3]), min(vertices[2::3])],
            "max": [max(vertices[0::3]), max(vertices[1::3]), max(vertices[2::3])]
        },
        {
            "bufferView": 1,
            "componentType": 5126,
            "count": len(normals) // 3,
            "type": "VEC3"
        },
        {
            "bufferView": 2,
            "componentType": 5123,
            "count": len(indices),
            "type": "SCALAR"
        }
    ]

    material = {
        "pbrMetallicRoughness": {
            "baseColorFactor": color,
            "metallicFactor": 0.85,
            "roughnessFactor": 0.25
        }
    }

    mesh = {
        "primitives": [
            {
                "attributes": {"POSITION": 0, "NORMAL": 1},
                "indices": 2,
                "material": 0
            }
        ]
    }

    combined = pos_bytes + norm_bytes + idx_bytes

    scene = {
        "asset": {"version": "2.0"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [mesh],
        "materials": [material],
        "buffers": [{
            "uri": "data:application/octet-stream;base64," + base64.b64encode(combined).decode(),
            "byteLength": len(combined)
        }],
        "bufferViews": buffer_views,
        "accessors": accessors
    }

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(scene, f, indent=2)


def create_necklace():
    segments = 48
    start_angle = math.radians(210)
    end_angle = math.radians(330)
    angles = [start_angle + (end_angle - start_angle) * i / (segments - 1) for i in range(segments)]
    outer_r = 0.55
    inner_r = 0.35
    verts = []
    norms = []
    for angle in angles:
        for radius in (outer_r, inner_r):
            x = radius * math.cos(angle)
            y = radius * math.sin(angle)
            verts.extend([x, y, 0.0])
            norms.extend([0, 0, 1])
    indices = []
    for i in range(segments - 1):
        o1 = i * 2
        i1 = o1 + 1
        o2 = o1 + 2
        i2 = o1 + 3
        indices.extend([o1, i1, o2, i1, i2, o2])
    return verts, norms, indices


def create_maang():
    verts = [
        0.0, 0.5, 0.0,
        -0.05, 0.3, 0.0,
        0.05, 0.3, 0.0,
        -0.12, 0.0, 0.0,
        0.12, 0.0, 0.0,
        0.0, -0.25, 0.0,
        -0.08, -0.4, 0.0,
        0.08, -0.4, 0.0,
        0.0, -0.6, 0.0
    ]
    norms = [0, 0, 1] * (len(verts) // 3)
    indices = [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 5, 6, 4, 4, 6, 7, 6, 8, 7]
    return verts, norms, indices

necklace = create_necklace()
maang = create_maang()
write_gltf('3dmodel/jewelry-necklace-01/scene.gltf', *necklace, color=[0.83, 0.71, 0.32, 1])
write_gltf('3dmodel/jewelry-maang-01/scene.gltf', *maang, color=[0.72, 0.45, 0.33, 1])
