import json
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple

spec = json.loads(Path('openapi_raw.txt').read_text())
components = spec.get('components', {})
schemas = components.get('schemas', {})

results: List[Dict[str, Any]] = []


def ref_name(ref: str) -> str:
    return ref.split('/')[-1]


def describe_type(schema: Dict[str, Any]) -> str:
    if '$ref' in schema:
        return ref_name(schema['$ref'])
    typ = schema.get('type')
    if typ == 'array':
        items = schema.get('items', {})
        item_type = describe_type(items)
        return f"array[{item_type}]"
    if typ and 'format' in schema:
        return f"{typ}({schema['format']})"
    return typ or 'object'


visited: Set[Tuple[str, str]] = set()


def walk_schema(schema: Dict[str, Any], parent_path: str):
    if '$ref' in schema:
        name = ref_name(schema['$ref'])
        ref_schema = schemas.get(name)
        key = (parent_path, name)
        if ref_schema is None or key in visited:
            return
        visited.add(key)
        walk_schema(ref_schema, parent_path)
        return

    if schema.get('type') == 'array':
        items = schema.get('items', {})
        walk_schema(items, parent_path)
        return

    properties = schema.get('properties', {})
    required_fields = set(schema.get('required', []))
    for prop, prop_schema in properties.items():
        entry = {
            'model': parent_path,
            'field': prop,
            'type': describe_type(prop_schema),
            'required': prop in required_fields,
            'description': prop_schema.get('description'),
            'example': prop_schema.get('example'),
            'enum': prop_schema.get('enum'),
            'parent': parent_path,
        }
        results.append(entry)
        new_parent = f"{parent_path}.{prop}"
        walk_schema(prop_schema, new_parent)


for name, schema in schemas.items():
    walk_schema(schema, name)

Path('parsed_fields.json').write_text(json.dumps(results, indent=2))
print(f"Extracted {len(results)} fields")
