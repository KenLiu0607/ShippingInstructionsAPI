import json
from typing import Any, Dict, List, Optional, Set, Tuple


METADATA_KEYS = [
    "description",
    "enum",
    "minItems",
    "maxItems",
    "pattern",
    "format",
    "example",
]


def load_schema(path: str = "openapi_raw.json") -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_ref(ref: str, schemas: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], str]:
    ref_name = ref.split("/")[-1]
    return schemas.get(ref_name), ref_name


def schema_type(schema: Dict[str, Any]) -> str:
    if not isinstance(schema, dict):
        return "unknown"
    if "$ref" in schema:
        return "ref"
    if "type" in schema:
        typ = schema["type"]
        return "number" if typ == "integer" else typ
    if "anyOf" in schema:
        return "anyOf"
    if "oneOf" in schema:
        return "oneOf"
    if "properties" in schema:
        return "object"
    return "unknown"


def copy_metadata(source: Dict[str, Any]) -> Dict[str, Any]:
    return {key: value for key, value in source.items() if key in METADATA_KEYS}


def merge_description(base: Optional[str], extra: Optional[str]) -> Optional[str]:
    if not extra:
        return base
    if not base:
        return extra
    if extra.strip() in base:
        return base
    return f"{base} {extra}".strip()


def collect_props(schema: Any) -> List[str]:
    if not isinstance(schema, dict):
        return []
    properties = schema.get("properties", {})
    if isinstance(properties, dict):
        return list(properties.keys())
    return []


def add_flat_field(
    output: List[Dict[str, Any]],
    *,
    field: str,
    model: str,
    parent: str,
    field_type: str,
    required: bool,
    sort: str,
    metadata: Optional[Dict[str, Any]] = None,
    props: Optional[List[str]] = None,
    **extra: Any,
) -> None:
    item: Dict[str, Any] = {
        "field": field,
        "model": model,
        "parent": parent,
        "type": field_type,
        "required": required,
        "sort": sort,
        "props": props or [],
    }
    if metadata:
        item.update(metadata)
    item.update(extra)
    output.append(item)


def expand_one_of(
    schema: Dict[str, Any],
    path: str,
    schemas: Dict[str, Any],
    output: List[Dict[str, Any]],
    stack: Set[str],
    sort_prefix: str,
) -> None:
    refs = [opt["$ref"] for opt in schema.get("oneOf", []) if "$ref" in opt]
    option_props: List[str] = collect_props(schema)
    for opt in schema.get("oneOf", []):
        option_props.extend(collect_props(opt))
    option_props = list(dict.fromkeys(option_props))
    one_of_path = f"{path}.oneOf"
    add_flat_field(
        output,
        field="oneOf",
        model=one_of_path,
        parent=path,
        field_type="oneOf",
        required=False,
        sort=sort_prefix,
        metadata=copy_metadata(schema),
        oneOf_refs=refs,
        discriminator=schema.get("discriminator"),
        props=option_props,
    )

    for opt_idx, option in enumerate(schema.get("oneOf", []), start=1):
        option_sort = f"{sort_prefix}.{opt_idx}"
        if "$ref" in option:
            target_schema, target_name = resolve_ref(option["$ref"], schemas)
            if not target_schema:
                continue
            option_path = f"{one_of_path}.{target_name}"
            option_type = schema_type(target_schema)
            add_flat_field(
                output,
                field=target_name,
                model=option_path,
                parent=one_of_path,
                field_type=option_type,
                required=False,
                sort=option_sort,
                metadata=copy_metadata(target_schema),
                ref=option["$ref"],
                props=collect_props(target_schema),
            )
            if target_name not in stack:
                walk_schema(target_schema, option_path, schemas, output, stack | {target_name}, option_sort)
        else:
            walk_schema(option, one_of_path, schemas, output, stack, option_sort)


def expand_any_of(
    schema: Dict[str, Any],
    path: str,
    schemas: Dict[str, Any],
    output: List[Dict[str, Any]],
    stack: Set[str],
    sort_prefix: str,
) -> None:
    refs = [opt["$ref"] for opt in schema.get("anyOf", []) if "$ref" in opt]
    option_props: List[str] = collect_props(schema)
    for opt in schema.get("anyOf", []):
        option_props.extend(collect_props(opt))
    option_props = list(dict.fromkeys(option_props))
    any_of_path = f"{path}.anyOf"
    add_flat_field(
        output,
        field="anyOf",
        model=any_of_path,
        parent=path,
        field_type="anyOf",
        required=False,
        sort=sort_prefix,
        metadata=copy_metadata(schema),
        oneOf_refs=refs,
        discriminator=schema.get("discriminator"),
        props=option_props,
    )

    for opt_idx, option in enumerate(schema.get("anyOf", []), start=1):
        option_sort = f"{sort_prefix}.{opt_idx}"
        if "$ref" in option:
            target_schema, target_name = resolve_ref(option["$ref"], schemas)
            if not target_schema:
                continue
            option_path = f"{any_of_path}.{target_name}"
            option_type = schema_type(target_schema)
            add_flat_field(
                output,
                field=target_name,
                model=option_path,
                parent=any_of_path,
                field_type=option_type,
                required=False,
                sort=option_sort,
                metadata=copy_metadata(target_schema),
                ref=option["$ref"],
                props=collect_props(target_schema),
            )
            if target_name not in stack:
                walk_schema(target_schema, option_path, schemas, output, stack | {target_name}, option_sort)
        else:
            walk_schema(option, any_of_path, schemas, output, stack, option_sort)


def walk_schema(
    schema: Dict[str, Any],
    path: str,
    schemas: Dict[str, Any],
    output: List[Dict[str, Any]],
    stack: Set[str],
    sort_prefix: str,
) -> None:
    required_fields = set(schema.get("required", []))

    index_counter = 0

    if "anyOf" in schema:
        index_counter += 1
        expand_any_of(schema, path, schemas, output, stack, f"{sort_prefix}.{index_counter}")

    if "oneOf" in schema:
        index_counter += 1
        expand_one_of(schema, path, schemas, output, stack, f"{sort_prefix}.{index_counter}")

    properties = schema.get("properties", {})
    if not properties:
        return

    for idx, (prop_name, prop_schema) in enumerate(properties.items(), start=index_counter + 1):
        field_path = f"{path}.{prop_name}"
        is_required = prop_name in required_fields
        metadata = copy_metadata(prop_schema)
        child_sort = f"{sort_prefix}.{idx}"

        if "$ref" in prop_schema:
            target_schema, target_name = resolve_ref(prop_schema["$ref"], schemas)
            if not target_schema:
                continue
            resolved_type = schema_type(target_schema)
            metadata = copy_metadata(prop_schema)
            metadata["description"] = merge_description(metadata.get("description"), target_schema.get("description"))
            add_flat_field(
                output,
                field=prop_name,
                model=field_path,
                parent=path,
                field_type=resolved_type,
                required=is_required,
                sort=child_sort,
                metadata=metadata,
                ref=prop_schema["$ref"],
                props=collect_props(target_schema),
            )
            if target_name not in stack:
                walk_schema(target_schema, field_path, schemas, output, stack | {target_name}, child_sort)
            continue

        if prop_schema.get("type") == "array":
            items = prop_schema.get("items", {})
            items_ref = items.get("$ref")
            items_type = None
            items_props: List[str] = []

            if items_ref:
                ref_schema, ref_name = resolve_ref(items_ref, schemas)
                items_type = schema_type(ref_schema or {})
                items_props = collect_props(ref_schema)
            else:
                items_type = schema_type(items)
                items_props = collect_props(items)

            array_path = field_path
            add_flat_field(
                output,
                field=prop_name,
                model=array_path,
                parent=path,
                field_type="array",
                required=is_required,
                sort=child_sort,
                metadata=metadata,
                items_type=items_type,
                items_ref=items_ref,
                props=items_props,
            )

            if items_ref:
                ref_schema, ref_name = resolve_ref(items_ref, schemas)
                if ref_schema and ref_name not in stack:
                    walk_schema(ref_schema, array_path, schemas, output, stack | {ref_name}, child_sort)
            elif items_type in {"object", "oneOf"} or items.get("properties") or items.get("oneOf"):
                walk_schema(items, array_path, schemas, output, stack, child_sort)
            continue

        if "anyOf" in prop_schema:
            any_of_path = f"{field_path}.anyOf"
            option_props: List[str] = collect_props(prop_schema)
            for opt in prop_schema.get("anyOf", []):
                option_props.extend(collect_props(opt))
            option_props = list(dict.fromkeys(option_props))
            add_flat_field(
                output,
                field=prop_name,
                model=any_of_path,
                parent=path,
                field_type="anyOf",
                required=is_required,
                sort=child_sort,
                metadata=metadata,
                oneOf_refs=[opt["$ref"] for opt in prop_schema["anyOf"] if "$ref" in opt],
                discriminator=prop_schema.get("discriminator"),
                props=option_props,
            )

            for opt_idx, option in enumerate(prop_schema["anyOf"], start=1):
                opt_sort = f"{child_sort}.{opt_idx}"
                if "$ref" in option:
                    target_schema, target_name = resolve_ref(option["$ref"], schemas)
                    if not target_schema:
                        continue
                    option_path = f"{any_of_path}.{target_name}"
                    option_type = schema_type(target_schema)
                    add_flat_field(
                        output,
                        field=target_name,
                        model=option_path,
                        parent=any_of_path,
                        field_type=option_type,
                        required=False,
                        sort=opt_sort,
                        metadata=copy_metadata(target_schema),
                        ref=option["$ref"],
                        props=collect_props(target_schema),
                    )
                    if target_name not in stack:
                        walk_schema(target_schema, option_path, schemas, output, stack | {target_name}, opt_sort)
                else:
                    walk_schema(option, any_of_path, schemas, output, stack, opt_sort)
            continue

        if "oneOf" in prop_schema:
            one_of_path = f"{field_path}.oneOf"
            option_props: List[str] = collect_props(prop_schema)
            for opt in prop_schema.get("oneOf", []):
                option_props.extend(collect_props(opt))
            option_props = list(dict.fromkeys(option_props))
            add_flat_field(
                output,
                field=prop_name,
                model=one_of_path,
                parent=path,
                field_type="oneOf",
                required=is_required,
                sort=child_sort,
                metadata=metadata,
                oneOf_refs=[opt["$ref"] for opt in prop_schema["oneOf"] if "$ref" in opt],
                discriminator=prop_schema.get("discriminator"),
                props=option_props,
            )

            for opt_idx, option in enumerate(prop_schema["oneOf"], start=1):
                opt_sort = f"{child_sort}.{opt_idx}"
                if "$ref" in option:
                    target_schema, target_name = resolve_ref(option["$ref"], schemas)
                    if not target_schema:
                        continue
                    option_path = f"{one_of_path}.{target_name}"
                    option_type = schema_type(target_schema)
                    add_flat_field(
                        output,
                        field=target_name,
                        model=option_path,
                        parent=one_of_path,
                        field_type=option_type,
                        required=False,
                        sort=opt_sort,
                        metadata=copy_metadata(target_schema),
                        ref=option["$ref"],
                        props=collect_props(target_schema),
                    )
                    if target_name not in stack:
                        walk_schema(target_schema, option_path, schemas, output, stack | {target_name}, opt_sort)
                else:
                    walk_schema(option, one_of_path, schemas, output, stack, opt_sort)
            continue

        field_type = schema_type(prop_schema)
        add_flat_field(
            output,
            field=prop_name,
            model=field_path,
            parent=path,
            field_type=field_type,
            required=is_required,
            sort=child_sort,
            metadata=metadata,
            props=collect_props(prop_schema),
        )

        if field_type == "object":
            walk_schema(prop_schema, field_path, schemas, output, stack, child_sort)


def generate_flat_tree(
    root: str = "CreateShippingInstructions",
    input_path: str = "openapi_raw.json",
) -> List[Dict[str, Any]]:
    data = load_schema(input_path)
    schemas = data.get("components", {}).get("schemas", {})

    output: List[Dict[str, Any]] = []
    root_schema = schemas.get(root)
    if not root_schema:
        raise ValueError(f"Schema '{root}' not found in {input_path}")

    # Add root node entry
    add_flat_field(
        output,
        field=root,
        model="*",
        parent="*",
        field_type="object",
        required=False,
        sort="1",
        metadata={"description": "root", "enum": [], "example": ""},
        props=collect_props(root_schema),
    )

    walk_schema(root_schema, root, schemas, output, {root}, "1")
    return output


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Flatten OpenAPI schemas to a JSON tree.")
    parser.add_argument("--root", default="CreateShippingInstructions", help="Root schema name")
    parser.add_argument("--input", default="openapi_raw.json", help="Path to OpenAPI JSON file")
    parser.add_argument(
        "--output",
        default=None,
        help="Output JSON path (default: <root>_flat_tree.json)",
    )

    args = parser.parse_args()
    output_path = args.output or f"{args.root}_flat_tree.json"

    flat_tree = generate_flat_tree(args.root, args.input)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(flat_tree, f, indent=2, ensure_ascii=False)

    print(f"Flattened schema written to {output_path}")
