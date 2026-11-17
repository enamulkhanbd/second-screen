use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlattenedToken {
    pub id: String,
    pub name: String,
    pub path: Vec<String>,
    pub group: String,
    pub set_name: String,
    #[serde(rename = "type")]
    pub token_type: String,
    pub raw_value: String,
    pub resolved_value: String,
    pub is_alias: bool,
}

fn is_token_leaf(node: &Value) -> bool {
    match node {
        Value::Object(map) => map.contains_key("value") || map.contains_key("$value"),
        _ => false,
    }
}

fn read_leaf_value(node: &Value) -> String {
    let mut current = node
        .get("value")
        .or_else(|| node.get("$value"))
        .unwrap_or(&Value::Null);

    while let Value::Object(map) = current {
        if let Some(next) = map.get("value").or_else(|| map.get("$value")) {
            current = next;
        } else {
            break;
        }
    }

    match current {
        Value::Null => String::new(),
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        other => other.to_string(),
    }
}

fn read_leaf_type(node: &Value, fallback_group: &str) -> String {
    if let Some(raw) = node.get("type").or_else(|| node.get("$type")) {
        if let Some(s) = raw.as_str() {
            let trimmed = s.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }
    let lower = fallback_group.to_ascii_lowercase();
    if lower.contains("color") {
        "color".to_string()
    } else if lower.contains("spacing") || lower.contains("space") {
        "spacing".to_string()
    } else if lower.contains("radius") || lower.contains("radii") {
        "borderRadius".to_string()
    } else {
        "other".to_string()
    }
}

fn collect_tokens(
    node: &Value,
    set_name: &str,
    path: &mut Vec<String>,
    out: &mut Vec<FlattenedToken>,
    lookup: &mut HashMap<String, String>,
) {
    if is_token_leaf(node) {
        let name = path.last().cloned().unwrap_or_default();
        let group = if path.len() > 1 {
            path[0].clone()
        } else {
            set_name.to_string()
        };
        let raw_value = read_leaf_value(node);
        let is_alias = raw_value.contains('{') && raw_value.contains('}');
        let full_key = path.join(".");
        let scoped_key = format!("{set_name}.{full_key}");
        lookup.insert(scoped_key.clone(), raw_value.clone());
        lookup.entry(full_key).or_insert_with(|| raw_value.clone());

        out.push(FlattenedToken {
            id: scoped_key,
            name,
            path: path.clone(),
            group,
            set_name: set_name.to_string(),
            token_type: read_leaf_type(node, &path.join(".")),
            raw_value: raw_value.clone(),
            resolved_value: raw_value,
            is_alias,
        });
        return;
    }

    if let Value::Object(map) = node {
        for (key, child) in map {
            if key.starts_with('$') {
                continue;
            }
            path.push(key.clone());
            collect_tokens(child, set_name, path, out, lookup);
            path.pop();
        }
    }
}

fn resolve_alias_value(
    raw: &str,
    lookup: &HashMap<String, String>,
    visited: &mut HashSet<String>,
) -> String {
    if !raw.contains('{') {
        return raw.to_string();
    }

    let trimmed = raw.trim();
    if trimmed.starts_with('{') && trimmed.ends_with('}') && trimmed.matches('{').count() == 1 {
        let ref_key = &trimmed[1..trimmed.len() - 1];
        if visited.contains(ref_key) {
            return raw.to_string();
        }
        if let Some(target) = lookup.get(ref_key) {
            visited.insert(ref_key.to_string());
            let resolved = resolve_alias_value(target, lookup, visited);
            visited.remove(ref_key);
            return resolved;
        }
    }

    raw.to_string()
}

/// Fast WASM entry point to flatten a DTCG RawTokensDocument JSON string and resolve direct aliases.
#[wasm_bindgen]
pub fn flatten_and_resolve_tokens_json(raw_doc_json: &str, selected_set: Option<String>) -> Result<String, JsValue> {
    let doc: Value = serde_json::from_str(raw_doc_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid token JSON: {e}")))?;

    let Value::Object(root) = doc else {
        return Ok("[]".to_string());
    };

    let mut tokens: Vec<FlattenedToken> = Vec::new();
    let mut lookup: HashMap<String, String> = HashMap::new();
    let filter_set = selected_set.filter(|s| !s.is_empty() && s != "ALL");

    for (set_name, set_tree) in &root {
        if set_name.starts_with('$') {
            continue;
        }
        if let Some(target) = &filter_set {
            if set_name != target {
                continue;
            }
        }
        let mut path = Vec::new();
        collect_tokens(set_tree, set_name, &mut path, &mut tokens, &mut lookup);
    }

    for token in &mut tokens {
        if token.is_alias {
            let mut visited = HashSet::new();
            token.resolved_value = resolve_alias_value(&token.raw_value, &lookup, &mut visited);
        }
    }

    serde_json::to_string(&tokens)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize tokens: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flattens_and_resolves_alias() {
        let input = r#"{
          "core": { "brand": { "primary": { "$value": "#2563eb", "$type": "color" } } },
          "semantic": { "btn": { "$value": "{brand.primary}", "$type": "color" } }
        }"#;
        let out_json = flatten_and_resolve_tokens_json(input, None).unwrap();
        let parsed: Vec<FlattenedToken> = serde_json::from_str(&out_json).unwrap();
        let btn = parsed.iter().find(|t| t.name == "btn").unwrap();
        assert_eq!(btn.resolved_value, "#2563eb");
        assert!(btn.is_alias);
    }
}
