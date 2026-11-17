use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::{HashMap, HashSet};
use wasm_bindgen::prelude::*;

// ============================================================================
// Data Models matching TypeScript definitions
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorModifier {
    #[serde(rename = "type")]
    pub mod_type: String,
    #[serde(default)]
    pub value: Value,
    #[serde(default)]
    pub space: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub format: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlattenedToken {
    pub id: String,
    pub name: String,
    pub path: Vec<String>,
    pub group: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subgroup: Option<String>,
    pub set_name: String,
    #[serde(rename = "type")]
    pub token_type: String,
    pub raw_value: String,
    pub resolved_value: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved_hex: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modify: Option<ColorModifier>,
    pub is_alias: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alias_target: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deprecated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deprecated_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deprecated_replacement: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deprecated_severity: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deprecated_remove_after: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub figma_variable_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ThemeResolutionConfigInput {
    #[serde(default)]
    pub active_sets_order: Vec<String>,
    #[serde(default)]
    pub active_sets: Vec<String>,
    #[serde(default)]
    pub source_sets: Vec<String>,
    #[serde(default)]
    pub inactive_sets: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ThemeOptionInput {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub selected_token_sets: HashMap<String, String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ThemeGroupInput {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub options: Vec<ThemeOptionInput>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatrixCellData {
    pub raw_value: Value,
    pub resolved_value: Value,
    pub is_alias: bool,
    pub token_path: Vec<String>,
    pub set_name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatrixRowData {
    pub token_key: String,
    #[serde(rename = "type")]
    pub token_type: String,
    pub group: String,
    pub category: String,
    pub cells: Map<String, Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenDiffItem {
    pub key: String,
    pub name: String,
    pub set_name: String,
    #[serde(rename = "type")]
    pub token_type: String,
    pub change_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_value: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_value: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LineDiffChunk {
    #[serde(rename = "type")]
    pub chunk_type: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_line_number: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_line_number: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiffItem {
    pub file_name: String,
    pub set_name: String,
    pub old_json: String,
    pub new_json: String,
    pub change_type: String,
    pub tokens: Vec<TokenDiffItem>,
    pub line_diff: Vec<LineDiffChunk>,
    pub added_count: usize,
    pub modified_count: usize,
    pub deleted_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentDiffSummary {
    pub files: Vec<FileDiffItem>,
    pub total_added: usize,
    pub total_modified: usize,
    pub total_deleted: usize,
    pub has_changes: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ZipInputFile {
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub content: String,
}

// ============================================================================
// Color Parsing, Conversions (sRGB / P3 / HSL / Lab / LCH / Oklab / Oklch) & Modifiers
// ============================================================================

#[derive(Debug, Clone, Copy)]
struct RgbaColor {
    r: f64, // 0..1 sRGB
    g: f64,
    b: f64,
    a: f64,
}

fn srgb_to_linear(c: f64) -> f64 {
    let abs = c.abs();
    let lin = if abs <= 0.04045 {
        abs / 12.92
    } else {
        ((abs + 0.055) / 1.055).powf(2.4)
    };
    if c < 0.0 { -lin } else { lin }
}

fn linear_to_srgb(c: f64) -> f64 {
    let abs = c.abs();
    let srgb = if abs <= 0.0031308 {
        abs * 12.92
    } else {
        1.055 * abs.powf(1.0 / 2.4) - 0.055
    };
    if c < 0.0 { -srgb } else { srgb }
}

fn clamp01(v: f64) -> f64 {
    v.clamp(0.0, 1.0)
}

fn round_digits(v: f64, digits: i32) -> f64 {
    let factor = 10_f64.powi(digits);
    (v * factor).round() / factor
}

fn parse_hex_color(s: &str) -> Option<RgbaColor> {
    let clean = s.trim().strip_prefix('#')?;
    let expanded = match clean.len() {
        3 => {
            let mut out = String::with_capacity(8);
            for ch in clean.chars() {
                out.push(ch);
                out.push(ch);
            }
            out.push_str("ff");
            out
        }
        4 => {
            let mut out = String::with_capacity(8);
            for ch in clean.chars() {
                out.push(ch);
                out.push(ch);
            }
            out
        }
        6 => format!("{clean}ff"),
        8 => clean.to_string(),
        _ => return None,
    };
    let r = u8::from_str_radix(&expanded[0..2], 16).ok()? as f64 / 255.0;
    let g = u8::from_str_radix(&expanded[2..4], 16).ok()? as f64 / 255.0;
    let b = u8::from_str_radix(&expanded[4..6], 16).ok()? as f64 / 255.0;
    let a = u8::from_str_radix(&expanded[6..8], 16).ok()? as f64 / 255.0;
    Some(RgbaColor { r, g, b, a })
}

fn parse_func_args(inner: &str) -> (Vec<&str>, Option<&str>) {
    if let Some((left, right)) = inner.split_once('/') {
        let parts: Vec<&str> = left
            .split(|c: char| c == ',' || c.is_whitespace())
            .filter(|p| !p.is_empty())
            .collect();
        (parts, Some(right.trim()))
    } else {
        let parts: Vec<&str> = inner
            .split(|c: char| c == ',' || c.is_whitespace())
            .filter(|p| !p.is_empty())
            .collect();
        (parts, None)
    }
}

fn parse_unit_or_pct(s: &str, max_scale: f64) -> Option<f64> {
    let t = s.trim();
    if let Some(pct) = t.strip_suffix('%') {
        pct.trim().parse::<f64>().ok().map(|v| (v / 100.0) * max_scale)
    } else {
        t.parse::<f64>().ok()
    }
}

fn parse_alpha(s: Option<&str>) -> f64 {
    match s {
        None => 1.0,
        Some(raw) => clamp01(parse_unit_or_pct(raw, 1.0).unwrap_or(1.0)),
    }
}

fn hsl_to_srgb(h_deg: f64, s_pct: f64, l_pct: f64, a: f64) -> RgbaColor {
    let h = ((h_deg % 360.0) + 360.0) % 360.0;
    let s = clamp01(s_pct / 100.0);
    let l = clamp01(l_pct / 100.0);
    let c = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let x = c * (1.0 - ((h / 60.0) % 2.0 - 1.0).abs());
    let m = l - c / 2.0;
    let (r1, g1, b1) = if h < 60.0 {
        (c, x, 0.0)
    } else if h < 120.0 {
        (x, c, 0.0)
    } else if h < 180.0 {
        (0.0, c, x)
    } else if h < 240.0 {
        (0.0, x, c)
    } else if h < 300.0 {
        (x, 0.0, c)
    } else {
        (c, 0.0, x)
    };
    RgbaColor {
        r: clamp01(r1 + m),
        g: clamp01(g1 + m),
        b: clamp01(b1 + m),
        a,
    }
}

fn srgb_to_hsl(c: RgbaColor) -> (f64, f64, f64) {
    let r = clamp01(c.r);
    let g = clamp01(c.g);
    let b = clamp01(c.b);
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;
    if (max - min).abs() < 1e-12 {
        return (0.0, 0.0, l * 100.0);
    }
    let d = max - min;
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };
    let mut h = if (max - r).abs() < 1e-12 {
        (g - b) / d + if g < b { 6.0 } else { 0.0 }
    } else if (max - g).abs() < 1e-12 {
        (b - r) / d + 2.0
    } else {
        (r - g) / d + 4.0
    };
    h /= 6.0;
    (h * 360.0, s * 100.0, l * 100.0)
}

// sRGB <-> Oklab / Oklch (Björn Ottosson standard matrices)
fn srgb_to_oklab(c: RgbaColor) -> (f64, f64, f64) {
    let lr = srgb_to_linear(c.r);
    let lg = srgb_to_linear(c.g);
    let lb = srgb_to_linear(c.b);

    let l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    let m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    let s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

    let l_ = l.cbrt();
    let m_ = m.cbrt();
    let s_ = s.cbrt();

    (
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )
}

fn oklab_to_srgb(l: f64, a_lab: f64, b_lab: f64, alpha: f64) -> RgbaColor {
    let l_ = l + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
    let m_ = l - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
    let s_ = l - 0.0894841775 * a_lab - 1.2914855480 * b_lab;

    let l3 = l_ * l_ * l_;
    let m3 = m_ * m_ * m_;
    let s3 = s_ * s_ * s_;

    let lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    let lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    let lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

    RgbaColor {
        r: clamp01(linear_to_srgb(lr)),
        g: clamp01(linear_to_srgb(lg)),
        b: clamp01(linear_to_srgb(lb)),
        a: clamp01(alpha),
    }
}

fn oklab_to_oklch(l: f64, a: f64, b: f64) -> (f64, f64, f64) {
    let c = (a * a + b * b).sqrt();
    let h = if c < 1e-6 {
        0.0
    } else {
        (b.atan2(a).to_degrees() + 360.0) % 360.0
    };
    (l, c, h)
}

fn oklch_to_oklab(l: f64, c: f64, h_deg: f64) -> (f64, f64, f64) {
    let rad = h_deg.to_radians();
    (l, c * rad.cos(), c * rad.sin())
}

// sRGB <-> CIE XYZ (D65) <-> CIE Lab / LCH (via D65->D50 Bradford)
fn srgb_to_lch(color: RgbaColor) -> (f64, f64, f64) {
    let r = srgb_to_linear(color.r);
    let g = srgb_to_linear(color.g);
    let b = srgb_to_linear(color.b);

    // Linear sRGB -> XYZ (D65)
    let x65 = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
    let y65 = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
    let z65 = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;

    // D65 -> D50 Bradford
    let x50 = 1.0478112 * x65 + 0.0228866 * y65 - 0.0501270 * z65;
    let y50 = 0.0295424 * x65 + 0.9904844 * y65 - 0.0170491 * z65;
    let z50 = -0.0092345 * x65 + 0.0150436 * y65 + 0.7521316 * z65;

    let f = |t: f64| -> f64 {
        let eps = 216.0 / 24389.0;
        let k = 24389.0 / 27.0;
        if t > eps {
            t.cbrt()
        } else {
            (k * t + 16.0) / 116.0
        }
    };

    let fx = f(x50 / 0.96422);
    let fy = f(y50 / 1.00000);
    let fz = f(z50 / 0.82521);

    let l = 116.0 * fy - 16.0;
    let a = 500.0 * (fx - fy);
    let b_lab = 200.0 * (fy - fz);
    let c = (a * a + b_lab * b_lab).sqrt();
    let h = if c < 1e-5 {
        0.0
    } else {
        (b_lab.atan2(a).to_degrees() + 360.0) % 360.0
    };
    (l, c, h)
}

fn lch_to_srgb(l: f64, c: f64, h_deg: f64, alpha: f64) -> RgbaColor {
    let rad = h_deg.to_radians();
    let a = c * rad.cos();
    let b_lab = c * rad.sin();

    let fy = (l + 16.0) / 116.0;
    let fx = a / 500.0 + fy;
    let fz = fy - b_lab / 200.0;

    let eps = 216.0 / 24389.0;
    let k = 24389.0 / 27.0;

    let xr = if fx.powi(3) > eps {
        fx.powi(3)
    } else {
        (116.0 * fx - 16.0) / k
    };
    let yr = if l > k * eps {
        ((l + 16.0) / 116.0).powi(3)
    } else {
        l / k
    };
    let zr = if fz.powi(3) > eps {
        fz.powi(3)
    } else {
        (116.0 * fz - 16.0) / k
    };

    let x50 = xr * 0.96422;
    let y50 = yr * 1.00000;
    let z50 = zr * 0.82521;

    // D50 -> D65 Bradford
    let x65 = 0.9555766 * x50 - 0.0230393 * y50 + 0.0631636 * z50;
    let y65 = -0.0282895 * x50 + 1.0099416 * y50 + 0.0210077 * z50;
    let z65 = 0.0122982 * x50 - 0.0204830 * y50 + 1.3299098 * z50;

    let lr = 3.2404542 * x65 - 1.5371385 * y65 - 0.4985314 * z65;
    let lg = -0.9692660 * x65 + 1.8760108 * y65 + 0.0415560 * z65;
    let lb = 0.0556434 * x65 - 0.2040259 * y65 + 1.0572252 * z65;

    RgbaColor {
        r: clamp01(linear_to_srgb(lr)),
        g: clamp01(linear_to_srgb(lg)),
        b: clamp01(linear_to_srgb(lb)),
        a: clamp01(alpha),
    }
}

fn srgb_to_p3(c: RgbaColor) -> (f64, f64, f64) {
    let lr = srgb_to_linear(c.r);
    let lg = srgb_to_linear(c.g);
    let lb = srgb_to_linear(c.b);

    let p3r = 0.8224621 * lr + 0.1775380 * lg;
    let p3g = 0.0331941 * lr + 0.9668058 * lg;
    let p3b = 0.0170827 * lr + 0.0723974 * lg + 0.9105199 * lb;

    (linear_to_srgb(p3r), linear_to_srgb(p3g), linear_to_srgb(p3b))
}

fn p3_to_srgb(pr: f64, pg: f64, pb: f64, alpha: f64) -> RgbaColor {
    let lr_p3 = srgb_to_linear(pr);
    let lg_p3 = srgb_to_linear(pg);
    let lb_p3 = srgb_to_linear(pb);

    let lr = 1.2249401 * lr_p3 - 0.2249404 * lg_p3;
    let lg = -0.0420569 * lr_p3 + 1.0420571 * lg_p3;
    let lb = -0.0196376 * lr_p3 - 0.0786361 * lg_p3 + 1.0982735 * lb_p3;

    RgbaColor {
        r: clamp01(linear_to_srgb(lr)),
        g: clamp01(linear_to_srgb(lg)),
        b: clamp01(linear_to_srgb(lb)),
        a: clamp01(alpha),
    }
}

fn parse_css_color(input: &str) -> Option<RgbaColor> {
    let t = input.trim();
    if t.starts_with('#') {
        return parse_hex_color(t);
    }
    let lower = t.to_ascii_lowercase();
    if let Some(inner) = lower
        .strip_prefix("rgba(")
        .or_else(|| lower.strip_prefix("rgb("))
        .and_then(|s| s.strip_suffix(')'))
    {
        let (parts, alpha_opt) = parse_func_args(inner);
        if parts.len() >= 3 {
            let r = parse_unit_or_pct(parts[0], 255.0)? / 255.0;
            let g = parse_unit_or_pct(parts[1], 255.0)? / 255.0;
            let b = parse_unit_or_pct(parts[2], 255.0)? / 255.0;
            let a = if parts.len() >= 4 {
                parse_alpha(Some(parts[3]))
            } else {
                parse_alpha(alpha_opt)
            };
            return Some(RgbaColor {
                r: clamp01(r),
                g: clamp01(g),
                b: clamp01(b),
                a,
            });
        }
    }
    if let Some(inner) = lower
        .strip_prefix("hsla(")
        .or_else(|| lower.strip_prefix("hsl("))
        .and_then(|s| s.strip_suffix(')'))
    {
        let (parts, alpha_opt) = parse_func_args(inner);
        if parts.len() >= 3 {
            let h = parts[0]
                .trim_end_matches("deg")
                .parse::<f64>()
                .ok()?;
            let s = parts[1].trim_end_matches('%').parse::<f64>().ok()?;
            let l = parts[2].trim_end_matches('%').parse::<f64>().ok()?;
            let a = if parts.len() >= 4 {
                parse_alpha(Some(parts[3]))
            } else {
                parse_alpha(alpha_opt)
            };
            return Some(hsl_to_srgb(h, s, l, a));
        }
    }
    if let Some(inner) = lower.strip_prefix("oklch(").and_then(|s| s.strip_suffix(')')) {
        let (parts, alpha_opt) = parse_func_args(inner);
        if parts.len() >= 3 {
            let l = parse_unit_or_pct(parts[0], 1.0)?;
            let c = parse_unit_or_pct(parts[1], 0.4)?;
            let h = parts[2].trim_end_matches("deg").parse::<f64>().ok()?;
            let a = parse_alpha(alpha_opt);
            let (ol, oa, ob) = oklch_to_oklab(l, c, h);
            return Some(oklab_to_srgb(ol, oa, ob, a));
        }
    }
    if let Some(inner) = lower.strip_prefix("lch(").and_then(|s| s.strip_suffix(')')) {
        let (parts, alpha_opt) = parse_func_args(inner);
        if parts.len() >= 3 {
            let l = parse_unit_or_pct(parts[0], 100.0)?;
            let c = parse_unit_or_pct(parts[1], 150.0)?;
            let h = parts[2].trim_end_matches("deg").parse::<f64>().ok()?;
            let a = parse_alpha(alpha_opt);
            return Some(lch_to_srgb(l, c, h, a));
        }
    }
    if let Some(inner) = lower.strip_prefix("color(").and_then(|s| s.strip_suffix(')')) {
        let (parts, alpha_opt) = parse_func_args(inner);
        if parts.len() >= 4 {
            let r = parts[1].parse::<f64>().ok()?;
            let g = parts[2].parse::<f64>().ok()?;
            let b = parts[3].parse::<f64>().ok()?;
            let a = parse_alpha(alpha_opt);
            if parts[0] == "display-p3" {
                return Some(p3_to_srgb(r, g, b, a));
            }
            if parts[0] == "srgb" {
                return Some(RgbaColor {
                    r: clamp01(r),
                    g: clamp01(g),
                    b: clamp01(b),
                    a,
                });
            }
        }
    }
    match lower.as_str() {
        "white" => Some(RgbaColor { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }),
        "black" => Some(RgbaColor { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }),
        "transparent" => Some(RgbaColor { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }),
        _ => None,
    }
}

fn color_to_hex(c: RgbaColor) -> String {
    let r = (clamp01(c.r) * 255.0).round() as u8;
    let g = (clamp01(c.g) * 255.0).round() as u8;
    let b = (clamp01(c.b) * 255.0).round() as u8;
    let a = (clamp01(c.a) * 255.0).round() as u8;
    if a < 255 {
        format!("#{r:02x}{g:02x}{b:02x}{a:02x}")
    } else {
        format!("#{r:02x}{g:02x}{b:02x}")
    }
}

fn format_rgba_in_space(c: RgbaColor, space_or_format: &str) -> String {
    match space_or_format.to_ascii_lowercase().as_str() {
        "hex" => color_to_hex(c),
        "srgb" => {
            let r = round_digits(clamp01(c.r), 4);
            let g = round_digits(clamp01(c.g), 4);
            let b = round_digits(clamp01(c.b), 4);
            if c.a < 1.0 {
                format!("color(srgb {r} {g} {b} / {:.2})", c.a)
            } else {
                format!("color(srgb {r} {g} {b})")
            }
        }
        "display-p3" | "p3" => {
            let (pr, pg, pb) = srgb_to_p3(c);
            let r = round_digits(pr, 4);
            let g = round_digits(pg, 4);
            let b = round_digits(pb, 4);
            if c.a < 1.0 {
                format!("color(display-p3 {r} {g} {b} / {:.2})", c.a)
            } else {
                format!("color(display-p3 {r} {g} {b})")
            }
        }
        "hsl" => {
            let (h, s, l) = srgb_to_hsl(c);
            let h_r = h.round() as i64;
            let s_r = s.round() as i64;
            let l_r = l.round() as i64;
            if c.a < 1.0 {
                format!("hsl({h_r} {s_r}% {l_r}% / {:.2})", c.a)
            } else {
                format!("hsl({h_r} {s_r}% {l_r}%)")
            }
        }
        "oklch" => {
            let (ol, oa, ob) = srgb_to_oklab(c);
            let (l, ch, h) = oklab_to_oklch(ol, oa, ob);
            let l_r = round_digits(l, 4);
            let c_r = round_digits(ch, 4);
            let h_r = round_digits(h, 2);
            if c.a < 1.0 {
                format!("oklch({l_r} {c_r} {h_r} / {:.2})", c.a)
            } else {
                format!("oklch({l_r} {c_r} {h_r})")
            }
        }
        "lch" => {
            let (l, ch, h) = srgb_to_lch(c);
            let l_r = round_digits(l, 3);
            let c_r = round_digits(ch, 3);
            let h_r = round_digits(h, 2);
            if c.a < 1.0 {
                format!("lch({l_r}% {c_r} {h_r} / {:.2})", c.a)
            } else {
                format!("lch({l_r}% {c_r} {h_r})")
            }
        }
        "rgb" | "rgba" => {
            let r = (clamp01(c.r) * 255.0).round() as u8;
            let g = (clamp01(c.g) * 255.0).round() as u8;
            let b = (clamp01(c.b) * 255.0).round() as u8;
            if c.a < 1.0 {
                format!("rgba({r}, {g}, {b}, {})", round_digits(c.a, 3))
            } else {
                format!("rgb({r}, {g}, {b})")
            }
        }
        _ => color_to_hex(c),
    }
}

fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

fn apply_color_modifier_internal(
    base_color: &str,
    modifier: &ColorModifier,
    resolved_mix_color: Option<&str>,
) -> (String, String) {
    let Some(mut color) = parse_css_color(base_color) else {
        return (base_color.to_string(), base_color.to_string());
    };

    let raw_val = match &modifier.value {
        Value::String(s) => s.trim().to_string(),
        Value::Number(n) => n.to_string(),
        _ => "0".to_string(),
    };
    let is_percent = raw_val.ends_with('%');
    let num = raw_val
        .replace('%', "")
        .trim()
        .parse::<f64>()
        .unwrap_or(0.0);
    let amount = if is_percent { num / 100.0 } else { num };
    let space = modifier
        .space
        .as_deref()
        .unwrap_or("lch")
        .to_ascii_lowercase();
    let mod_type = modifier.mod_type.to_ascii_lowercase();

    match mod_type.as_str() {
        "lighten" => match space.as_str() {
            "lch" => {
                let (mut l, mut c, h) = srgb_to_lch(color);
                let diff = 100.0 - l;
                l = (l + diff * amount).clamp(0.0, 100.0);
                c = (c * (1.0 - amount)).max(0.0);
                color = lch_to_srgb(l, c, h, color.a);
            }
            "oklch" => {
                let (ol, oa, ob) = srgb_to_oklab(color);
                let (mut l, mut c, h) = oklab_to_oklch(ol, oa, ob);
                let diff = 1.0 - l;
                l = (l + diff * amount).clamp(0.0, 1.0);
                c = (c * (1.0 - amount)).max(0.0);
                let (nl, na, nb) = oklch_to_oklab(l, c, h);
                color = oklab_to_srgb(nl, na, nb, color.a);
            }
            "hsl" => {
                let (h, s, mut l) = srgb_to_hsl(color);
                l = (l + (100.0 - l) * amount).clamp(0.0, 100.0);
                color = hsl_to_srgb(h, s, l, color.a);
            }
            "p3" => {
                let (r, g, b) = srgb_to_p3(color);
                color = p3_to_srgb(
                    (r + (1.0 - r) * amount).clamp(0.0, 1.0),
                    (g + (1.0 - g) * amount).clamp(0.0, 1.0),
                    (b + (1.0 - b) * amount).clamp(0.0, 1.0),
                    color.a,
                );
            }
            _ => {
                color.r = (color.r + (1.0 - color.r) * amount).clamp(0.0, 1.0);
                color.g = (color.g + (1.0 - color.g) * amount).clamp(0.0, 1.0);
                color.b = (color.b + (1.0 - color.b) * amount).clamp(0.0, 1.0);
            }
        },
        "darken" => match space.as_str() {
            "lch" => {
                let (mut l, mut c, h) = srgb_to_lch(color);
                l = (l - l * amount).clamp(0.0, 100.0);
                c = (c * (1.0 - amount)).max(0.0);
                color = lch_to_srgb(l, c, h, color.a);
            }
            "oklch" => {
                let (ol, oa, ob) = srgb_to_oklab(color);
                let (mut l, mut c, h) = oklab_to_oklch(ol, oa, ob);
                l = (l - l * amount).clamp(0.0, 1.0);
                c = (c * (1.0 - amount)).max(0.0);
                let (nl, na, nb) = oklch_to_oklab(l, c, h);
                color = oklab_to_srgb(nl, na, nb, color.a);
            }
            "hsl" => {
                let (h, s, mut l) = srgb_to_hsl(color);
                l = (l - l * amount).clamp(0.0, 100.0);
                color = hsl_to_srgb(h, s, l, color.a);
            }
            "p3" => {
                let (r, g, b) = srgb_to_p3(color);
                color = p3_to_srgb(
                    (r - r * amount).clamp(0.0, 1.0),
                    (g - g * amount).clamp(0.0, 1.0),
                    (b - b * amount).clamp(0.0, 1.0),
                    color.a,
                );
            }
            _ => {
                color.r = (color.r - color.r * amount).clamp(0.0, 1.0);
                color.g = (color.g - color.g * amount).clamp(0.0, 1.0);
                color.b = (color.b - color.b * amount).clamp(0.0, 1.0);
            }
        },
        "mix" => {
            let mix_target = resolved_mix_color
                .or(modifier.color.as_deref())
                .unwrap_or("#ffffff");
            if let Some(mix_c) = parse_css_color(mix_target) {
                let t = clamp01(amount);
                let mixed_a = lerp(color.a, mix_c.a, t);
                color = match space.as_str() {
                    "oklch" | "oklab" => {
                        let (l1, a1, b1) = srgb_to_oklab(color);
                        let (l2, a2, b2) = srgb_to_oklab(mix_c);
                        oklab_to_srgb(lerp(l1, l2, t), lerp(a1, a2, t), lerp(b1, b2, t), mixed_a)
                    }
                    "lch" => {
                        let (l1, c1, h1) = srgb_to_lch(color);
                        let (l2, c2, h2) = srgb_to_lch(mix_c);
                        let mut dh = h2 - h1;
                        if dh > 180.0 {
                            dh -= 360.0;
                        } else if dh < -180.0 {
                            dh += 360.0;
                        }
                        let h = (h1 + dh * t + 360.0) % 360.0;
                        lch_to_srgb(lerp(l1, l2, t), lerp(c1, c2, t), h, mixed_a)
                    }
                    _ => RgbaColor {
                        r: lerp(color.r, mix_c.r, t),
                        g: lerp(color.g, mix_c.g, t),
                        b: lerp(color.b, mix_c.b, t),
                        a: mixed_a,
                    },
                };
            }
        }
        "alpha" => {
            color.a = clamp01(amount);
        }
        _ => {}
    }

    let hex = color_to_hex(color);
    let resolved = if let Some(fmt) = modifier.format.as_deref() {
        format_rgba_in_space(color, fmt)
    } else if space == "srgb" && base_color.trim().starts_with('#') {
        hex.clone()
    } else if matches!(space.as_str(), "oklch" | "lch" | "hsl" | "display-p3" | "p3") {
        format_rgba_in_space(color, &space)
    } else {
        hex.clone()
    };

    (resolved, hex)
}

#[wasm_bindgen]
pub fn format_color_value_wasm(val: &str, color_space: &str) -> String {
    let trimmed = val.trim();
    if color_space == "as-authored" || trimmed.is_empty() {
        return val.to_string();
    }
    if !trimmed.starts_with('#') && !trimmed.starts_with("rgb") && !trimmed.starts_with("hsl") {
        return trimmed.to_string();
    }
    match parse_css_color(trimmed) {
        Some(c) => {
            if color_space == "hex" && trimmed.starts_with('#') {
                trimmed.to_string()
            } else {
                format_rgba_in_space(c, color_space)
            }
        }
        None => trimmed.to_string(),
    }
}

#[wasm_bindgen]
pub fn apply_color_modifier_json(
    base_color: &str,
    modifier_json: &str,
    resolved_mix_color: Option<String>,
) -> Result<String, JsValue> {
    let modifier: ColorModifier = serde_json::from_str(modifier_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid modifier JSON: {e}")))?;
    let (resolved_value, hex) =
        apply_color_modifier_internal(base_color, &modifier, resolved_mix_color.as_deref());
    serde_json::to_string(&serde_json::json!({
        "resolvedValue": resolved_value,
        "hex": hex,
    }))
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

// ============================================================================
// Token Resolution, Theme Priority Index & Sorting
// ============================================================================

fn is_token_leaf(node: &Value) -> bool {
    match node {
        Value::Object(map) => map.contains_key("value") || map.contains_key("$value"),
        _ => false,
    }
}

fn read_leaf_value(node: &Value) -> Value {
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
    current.clone()
}

fn value_to_string(v: &Value) -> String {
    match v {
        Value::Null => String::new(),
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        other => other.to_string(),
    }
}

fn read_leaf_type(node: &Value, group_hint: &str) -> String {
    if let Some(raw) = node.get("type").or_else(|| node.get("$type")) {
        let s = value_to_string(raw);
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            let lower = trimmed.to_ascii_lowercase();
            return match lower.as_str() {
                "color" | "colors" => "color".to_string(),
                "spacing" | "space" => "spacing".to_string(),
                "sizing" | "size" | "dimension" | "dimensions" => "sizing".to_string(),
                "borderradius" | "radius" | "radii" => "borderRadius".to_string(),
                "borderwidth" | "border" => "borderWidth".to_string(),
                "opacity" => "opacity".to_string(),
                "boxshadow" | "shadow" => "boxShadow".to_string(),
                "typography" | "fontfamilies" | "fontweights" | "fontsizes" | "lineheights"
                | "letterspacing" => "typography".to_string(),
                _ => trimmed.to_string(),
            };
        }
    }
    if let Some(val) = node.get("value").or_else(|| node.get("$value")) {
        if let Some(obj) = val.as_object() {
            if obj.contains_key("fontFamily")
                || obj.contains_key("fontSize")
                || obj.contains_key("fontWeight")
                || obj.contains_key("lineHeight")
            {
                return "typography".to_string();
            }
            if obj.contains_key("blur") || obj.contains_key("spread") {
                return "boxShadow".to_string();
            }
        }
    }
    let lower = group_hint.to_ascii_lowercase();
    if lower.contains("color")
        || lower.contains("bg")
        || lower.contains("text")
        || lower.contains("border")
        || lower.contains("icon")
        || lower.contains("palette")
        || lower.contains("fill")
        || lower.contains("stroke")
        || lower.contains("brand")
    {
        "color".to_string()
    } else if lower.contains("spacing") || lower.contains("gap") || lower.contains("padding") {
        "spacing".to_string()
    } else if lower.contains("radius") || lower.contains("radii") {
        "borderRadius".to_string()
    } else if lower.contains("font") || lower.contains("typography") {
        "typography".to_string()
    } else if lower.contains("size") || lower.contains("dimension") {
        "sizing".to_string()
    } else if lower.contains("opacity") {
        "opacity".to_string()
    } else if lower.contains("shadow") || lower.contains("elevation") {
        "boxShadow".to_string()
    } else {
        "other".to_string()
    }
}

fn extract_color_modifier(node: &Value) -> Option<ColorModifier> {
    let ext = node.get("$extensions");
    let raw = ext
        .and_then(|e| e.get("studio.tokens"))
        .and_then(|st| st.get("modify"))
        .or_else(|| ext.and_then(|e| e.get("modify")))
        .or_else(|| node.get("studio.tokens").and_then(|st| st.get("modify")))
        .or_else(|| node.get("modify"))?;
    let parsed: ColorModifier = serde_json::from_value(raw.clone()).ok()?;
    if parsed.mod_type.trim().is_empty() {
        return None;
    }
    Some(parsed)
}

fn normalize_ref_key(k: &str) -> String {
    k.trim()
        .trim_matches(|c| c == '.' || c == '/' || c == ' ')
        .to_ascii_lowercase()
}

fn build_lookup_index(
    root: &Map<String, Value>,
    theme_cfg: Option<&ThemeResolutionConfigInput>,
) -> HashMap<String, Vec<(String, Value)>> {
    let mut index: HashMap<String, Vec<(String, Value)>> = HashMap::new();
    let all_sets: Vec<String> = root
        .keys()
        .filter(|k| !k.starts_with('$'))
        .cloned()
        .collect();

    let inactive: HashSet<&str> = theme_cfg
        .map(|cfg| cfg.inactive_sets.iter().map(|s| s.as_str()).collect())
        .unwrap_or_default();

    let mut ordered_sets: Vec<String> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();

    if let Some(cfg) = theme_cfg {
        for s in cfg
            .active_sets_order
            .iter()
            .chain(cfg.active_sets.iter())
            .chain(cfg.source_sets.iter())
        {
            if root.contains_key(s) && !inactive.contains(s.as_str()) && seen.insert(s.clone()) {
                ordered_sets.push(s.clone());
            }
        }
    }
    for s in all_sets {
        if !inactive.contains(s.as_str()) && seen.insert(s.clone()) {
            ordered_sets.push(s);
        }
    }

    fn walk_index(
        node: &Value,
        set_name: &str,
        path: &mut Vec<String>,
        index: &mut HashMap<String, Vec<(String, Value)>>,
    ) {
        if is_token_leaf(node) {
            let dot_key = path.join(".").to_ascii_lowercase();
            let val = read_leaf_value(node);
            index
                .entry(dot_key.clone())
                .or_default()
                .push((set_name.to_string(), val.clone()));
            let scoped = format!(
                "{}.{}",
                set_name
                    .trim_end_matches(".json")
                    .replace(['/', '\\'], ".")
                    .to_ascii_lowercase(),
                dot_key
            );
            index
                .entry(scoped)
                .or_default()
                .push((set_name.to_string(), val));
            return;
        }
        if let Value::Object(map) = node {
            for (k, v) in map {
                if k.starts_with('$') {
                    continue;
                }
                path.push(k.clone());
                walk_index(v, set_name, path, index);
                path.pop();
            }
        }
    }

    for set_name in ordered_sets {
        if let Some(tree) = root.get(&set_name) {
            let mut path = Vec::new();
            walk_index(tree, &set_name, &mut path, &mut index);
        }
    }
    index
}

fn lookup_target<'a>(
    ref_key: &str,
    preferred_set: &str,
    index: &'a HashMap<String, Vec<(String, Value)>>,
) -> Option<&'a (String, Value)> {
    let norm = normalize_ref_key(ref_key);
    let entries = index.get(&norm)?;
    entries
        .iter()
        .find(|(set_name, _)| set_name == preferred_set)
        .or_else(|| entries.first())
}

fn resolve_alias_recursive(
    raw: &str,
    preferred_set: &str,
    index: &HashMap<String, Vec<(String, Value)>>,
    visited: &mut HashSet<String>,
    depth: usize,
) -> String {
    if depth > 20 || !raw.contains('{') {
        return raw.to_string();
    }

    let trimmed = raw.trim();
    if trimmed.starts_with('{')
        && trimmed.ends_with('}')
        && trimmed.matches('{').count() == 1
        && trimmed.matches('}').count() == 1
    {
        let inner = &trimmed[1..trimmed.len() - 1];
        let norm = normalize_ref_key(inner);
        if visited.contains(&norm) {
            return raw.to_string();
        }
        if let Some((target_set, target_val)) = lookup_target(inner, preferred_set, index) {
            visited.insert(norm.clone());
            let target_str = value_to_string(target_val);
            let resolved = resolve_alias_recursive(&target_str, target_set, index, visited, depth + 1);
            visited.remove(&norm);
            return resolved;
        }
        return raw.to_string();
    }

    // Interpolate embedded references like "rgba({color.brand}, 0.5)"
    let mut out = String::with_capacity(raw.len());
    let mut rest = raw;
    while let Some(open) = rest.find('{') {
        out.push_str(&rest[..open]);
        let after_open = &rest[open + 1..];
        if let Some(close) = after_open.find('}') {
            let token_ref = &after_open[..close];
            if !token_ref.is_empty() && !token_ref.contains('{') && !token_ref.contains('"') {
                let norm = normalize_ref_key(token_ref);
                if !visited.contains(&norm) {
                    if let Some((target_set, target_val)) =
                        lookup_target(token_ref, preferred_set, index)
                    {
                        visited.insert(norm.clone());
                        let target_str = value_to_string(target_val);
                        let sub = resolve_alias_recursive(
                            &target_str,
                            target_set,
                            index,
                            visited,
                            depth + 1,
                        );
                        visited.remove(&norm);
                        out.push_str(&sub);
                        rest = &after_open[close + 1..];
                        continue;
                    }
                }
            }
            out.push('{');
            out.push_str(token_ref);
            out.push('}');
            rest = &after_open[close + 1..];
        } else {
            out.push_str(&rest[open..]);
            rest = "";
            break;
        }
    }
    out.push_str(rest);
    out
}

fn read_deprecation(node: &Value) -> (Option<bool>, Option<String>, Option<String>, Option<String>, Option<String>) {
    let raw_dep = node
        .get("$deprecated")
        .or_else(|| node.get("deprecated"))
        .or_else(|| {
            node.get("$extensions")
                .and_then(|e| e.get("studio.tokens"))
                .and_then(|st| st.get("deprecated"))
        });

    match raw_dep {
        None | Some(Value::Bool(false)) | Some(Value::Null) => (None, None, None, None, None),
        Some(Value::Bool(true)) => (Some(true), None, None, Some("warning".to_string()), None),
        Some(Value::String(msg)) => {
            let clean = msg.trim();
            (
                Some(true),
                if clean.is_empty() { None } else { Some(clean.to_string()) },
                None,
                Some("warning".to_string()),
                None,
            )
        }
        Some(Value::Object(obj)) => {
            if obj.get("deprecated").and_then(|v| v.as_bool()) == Some(false) {
                return (None, None, None, None, None);
            }
            let message = obj
                .get("message")
                .or_else(|| obj.get("reason"))
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            let replacement = obj
                .get("replacementToken")
                .or_else(|| obj.get("replacement"))
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            let severity = obj
                .get("severity")
                .and_then(|v| v.as_str())
                .map(|s| if s.trim().eq_ignore_ascii_case("error") { "error".to_string() } else { "warning".to_string() })
                .or_else(|| Some("warning".to_string()));
            let remove_after = obj
                .get("removeAfter")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            (Some(true), message, replacement, severity, remove_after)
        }
        _ => (Some(true), None, None, Some("warning".to_string()), None),
    }
}

fn collect_flattened_tokens(
    node: &Value,
    set_name: &str,
    path: &mut Vec<String>,
    index: &HashMap<String, Vec<(String, Value)>>,
    out: &mut Vec<FlattenedToken>,
) {
    if is_token_leaf(node) {
        let name = path.join(".");
        let group = if path.len() > 1 {
            path[0].clone()
        } else {
            String::new()
        };
        let subgroup = if path.len() > 2 {
            Some(path[1].clone())
        } else {
            None
        };

        let raw_val_json = read_leaf_value(node);
        let raw_value = value_to_string(&raw_val_json);
        let is_alias = raw_value.contains('{') && raw_value.contains('}');
        let alias_target = if is_alias {
            raw_value
                .find('{')
                .and_then(|start| raw_value[start + 1..].find('}').map(|end| raw_value[start + 1..start + 1 + end].to_string()))
        } else {
            None
        };

        let mut visited = HashSet::new();
        let mut resolved_value = resolve_alias_recursive(&raw_value, set_name, index, &mut visited, 0);
        let modifier = extract_color_modifier(node);
        let mut resolved_hex: Option<String> = None;

        if let Some(mut mod_spec) = modifier.clone() {
            let resolved_mix = mod_spec.color.as_deref().map(|c| {
                if c.contains('{') {
                    let mut v = HashSet::new();
                    resolve_alias_recursive(c, set_name, index, &mut v, 0)
                } else {
                    c.to_string()
                }
            });
            if let Value::String(mv) = &mod_spec.value {
                if mv.contains('{') {
                    let mut v = HashSet::new();
                    mod_spec.value = Value::String(resolve_alias_recursive(mv, set_name, index, &mut v, 0));
                }
            }
            let (mod_res, mod_hex) =
                apply_color_modifier_internal(&resolved_value, &mod_spec, resolved_mix.as_deref());
            resolved_value = mod_res;
            resolved_hex = Some(mod_hex);
        } else if let Some(parsed) = parse_css_color(&resolved_value) {
            resolved_hex = Some(color_to_hex(parsed));
        }

        let description = node
            .get("description")
            .or_else(|| node.get("$description"))
            .filter(|v| !v.is_null())
            .map(value_to_string);

        let (deprecated, deprecated_message, deprecated_replacement, deprecated_severity, deprecated_remove_after) =
            read_deprecation(node);

        let figma_variable_key = node
            .get("$figmaVariableReferences")
            .or_else(|| node.get("figmaVariableKey"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let category = node
            .get("category")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let mut full_path = Vec::with_capacity(path.len() + 1);
        full_path.push(set_name.to_string());
        full_path.extend(path.iter().cloned());

        out.push(FlattenedToken {
            id: format!("{set_name}.{name}"),
            name,
            path: full_path,
            group: group.clone(),
            subgroup,
            set_name: set_name.to_string(),
            token_type: read_leaf_type(node, &group),
            raw_value,
            resolved_value,
            resolved_hex,
            modify: modifier,
            is_alias,
            alias_target,
            description,
            deprecated,
            deprecated_message,
            deprecated_replacement,
            deprecated_severity,
            deprecated_remove_after,
            figma_variable_key,
            category,
        });
        return;
    }

    if let Value::Object(map) = node {
        for (key, child) in map {
            if key.starts_with('$') {
                continue;
            }
            path.push(key.clone());
            collect_flattened_tokens(child, set_name, path, index, out);
            path.pop();
        }
    }
}

/// Fast WASM entry point to flatten a DTCG RawTokensDocument JSON string and resolve aliases/themes/modifiers.
#[wasm_bindgen]
pub fn flatten_and_resolve_tokens_json(
    raw_doc_json: &str,
    selected_set: Option<String>,
    theme_config_json: Option<String>,
) -> Result<String, JsValue> {
    let doc: Value = serde_json::from_str(raw_doc_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid token JSON: {e}")))?;

    let Value::Object(root) = doc else {
        return Ok("[]".to_string());
    };

    let theme_cfg: Option<ThemeResolutionConfigInput> = match theme_config_json {
        Some(raw) if !raw.trim().is_empty() && raw != "null" => serde_json::from_str(&raw).ok(),
        _ => None,
    };

    let index = build_lookup_index(&root, theme_cfg.as_ref());
    let mut tokens: Vec<FlattenedToken> = Vec::new();
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
        collect_flattened_tokens(set_tree, set_name, &mut path, &index, &mut tokens);
    }

    tokens.sort_by(|a, b| a.name.to_ascii_lowercase().cmp(&b.name.to_ascii_lowercase()));

    serde_json::to_string(&tokens)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize tokens: {e}")))
}

// ============================================================================
// Multi-Mode Theme Matrix Builder
// ============================================================================

fn find_set_in_root<'a>(declared: &str, root: &'a Map<String, Value>) -> Option<(&'a String, &'a Value)> {
    if let Some((k, v)) = root.get_key_value(declared) {
        return Some((k, v));
    }
    let norm_declared = declared
        .trim_end_matches(".json")
        .replace('\\', "/")
        .to_ascii_lowercase();
    root.iter().find(|(k, _)| {
        !k.starts_with('$')
            && k.trim_end_matches(".json")
                .replace('\\', "/")
                .to_ascii_lowercase()
                == norm_declared
    })
}

fn find_node_by_path<'a>(tree: &'a Value, path_segments: &[String], set_name: &str) -> Option<&'a Value> {
    let mut curr = tree;
    for seg in path_segments {
        if let Value::Object(map) = curr {
            if let Some(next) = map.get(seg) {
                curr = next;
                continue;
            }
        }
        curr = &Value::Null;
        break;
    }
    if is_token_leaf(curr) {
        return Some(curr);
    }
    // Check wrapper matching set name
    let short = set_name.rsplit('/').next().unwrap_or(set_name);
    if let Value::Object(map) = tree {
        for (k, v) in map {
            if k.eq_ignore_ascii_case(set_name) || k.eq_ignore_ascii_case(short) {
                let mut sub = v;
                let mut ok = true;
                for seg in path_segments {
                    if let Some(next) = sub.get(seg) {
                        sub = next;
                    } else {
                        ok = false;
                        break;
                    }
                }
                if ok && is_token_leaf(sub) {
                    return Some(sub);
                }
            }
        }
    }
    None
}

fn get_category_for_type(t: &str) -> &'static str {
    match t.to_ascii_lowercase().as_str() {
        "color" => "color",
        "dimension" | "spacing" | "sizing" | "borderradius" | "borderwidth" => "dimension",
        "typography" | "fontfamily" | "fontweight" | "fontsize" | "lineheight" | "letterspacing" => "typography",
        _ => "other",
    }
}

#[wasm_bindgen]
pub fn build_theme_matrix_json(
    raw_doc_json: &str,
    group_json: &str,
    active_option_ids_json: Option<String>,
    all_groups_json: Option<String>,
) -> Result<String, JsValue> {
    let doc: Value = serde_json::from_str(raw_doc_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid token JSON: {e}")))?;
    let Value::Object(root) = doc else {
        return Ok("[]".to_string());
    };
    let group: ThemeGroupInput = serde_json::from_str(group_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid group JSON: {e}")))?;
    let active_option_ids: HashMap<String, String> = active_option_ids_json
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let all_groups: Vec<ThemeGroupInput> = all_groups_json
        .and_then(|s| serde_json::from_str(&s).ok())
        .filter(|g: &Vec<ThemeGroupInput>| !g.is_empty())
        .unwrap_or_else(|| vec![group.clone()]);

    let mut group_set_keys: HashSet<String> = HashSet::new();
    let mut option_enabled_sets: HashMap<String, Vec<String>> = HashMap::new();

    for opt in &group.options {
        let mut enabled: Vec<String> = Vec::new();
        for (set_name, status) in &opt.selected_token_sets {
            if status == "enabled" {
                if let Some((actual_key, _)) = find_set_in_root(set_name, &root) {
                    group_set_keys.insert(actual_key.clone());
                    enabled.push(actual_key.clone());
                }
            }
        }
        option_enabled_sets.insert(opt.name.clone(), enabled);
    }

    if group_set_keys.is_empty() {
        return Ok("[]".to_string());
    }

    let mut tokens_meta: HashMap<String, (String, String, Vec<String>)> = HashMap::new();

    fn collect_matrix_keys(
        node: &Value,
        set_name: &str,
        path: &mut Vec<String>,
        tokens_meta: &mut HashMap<String, (String, String, Vec<String>)>,
    ) {
        if is_token_leaf(node) {
            let short = set_name.rsplit('/').next().unwrap_or(set_name);
            let logical_path: Vec<String> = if path.len() > 1
                && (path[0].eq_ignore_ascii_case(set_name) || path[0].eq_ignore_ascii_case(short))
            {
                path[1..].to_vec()
            } else {
                path.clone()
            };
            let key = logical_path.join(".");
            tokens_meta.entry(key).or_insert_with(|| {
                let grp = if logical_path.len() > 1 {
                    logical_path[0].clone()
                } else {
                    String::new()
                };
                let t = read_leaf_type(node, &logical_path.join("."));
                (t, grp, logical_path)
            });
            return;
        }
        if let Value::Object(map) = node {
            for (k, child) in map {
                if k.starts_with('$') {
                    continue;
                }
                path.push(k.clone());
                collect_matrix_keys(child, set_name, path, tokens_meta);
                path.pop();
            }
        }
    }

    for set_name in &group_set_keys {
        if let Some(tree) = root.get(set_name) {
            let mut path = Vec::new();
            collect_matrix_keys(tree, set_name, &mut path, &mut tokens_meta);
        }
    }

    // Build per-option lookup indices
    let mut option_indices: HashMap<String, HashMap<String, Vec<(String, Value)>>> = HashMap::new();
    for opt in &group.options {
        let mut active_sets_order: Vec<String> = Vec::new();
        let mut inactive_sets: HashSet<String> = HashSet::new();
        for g in &all_groups {
            let chosen_id = if g.id == group.id {
                opt.id.clone()
            } else {
                active_option_ids
                    .get(&g.id)
                    .cloned()
                    .unwrap_or_else(|| g.options.first().map(|o| o.id.clone()).unwrap_or_default())
            };
            if let Some(chosen_opt) = g.options.iter().find(|o| o.id == chosen_id) {
                for (sn, status) in &chosen_opt.selected_token_sets {
                    if let Some((actual_key, _)) = find_set_in_root(sn, &root) {
                        if status == "enabled" || status == "source" {
                            active_sets_order.push(actual_key.clone());
                            inactive_sets.remove(actual_key);
                        } else if status == "disabled" {
                            inactive_sets.insert(actual_key.clone());
                        }
                    }
                }
            }
        }
        let cfg = ThemeResolutionConfigInput {
            active_sets_order,
            active_sets: Vec::new(),
            source_sets: Vec::new(),
            inactive_sets: inactive_sets.into_iter().collect(),
        };
        option_indices.insert(opt.name.clone(), build_lookup_index(&root, Some(&cfg)));
    }

    let mut rows: Vec<MatrixRowData> = Vec::with_capacity(tokens_meta.len());
    for (token_key, (tok_type, tok_group, path_segments)) in tokens_meta {
        let mut cells = Map::new();
        for opt in &group.options {
            let target_sets = option_enabled_sets.get(&opt.name).map(|v| v.as_slice()).unwrap_or(&[]);
            let mut found_leaf: Option<(&Value, &str)> = None;
            for set_name in target_sets {
                if let Some(tree) = root.get(set_name) {
                    if let Some(leaf) = find_node_by_path(tree, &path_segments, set_name) {
                        found_leaf = Some((leaf, set_name.as_str()));
                        break;
                    }
                }
            }

            if let Some((leaf, found_set)) = found_leaf {
                let raw_val = read_leaf_value(leaf);
                let raw_str = value_to_string(&raw_val);
                let opt_index = &option_indices[&opt.name];
                let mut visited = HashSet::new();
                let mut resolved_str =
                    resolve_alias_recursive(&raw_str, found_set, opt_index, &mut visited, 0);
                if let Some(mut mod_spec) = extract_color_modifier(leaf) {
                    let resolved_mix = mod_spec.color.as_deref().map(|c| {
                        if c.contains('{') {
                            let mut v = HashSet::new();
                            resolve_alias_recursive(c, found_set, opt_index, &mut v, 0)
                        } else {
                            c.to_string()
                        }
                    });
                    if let Value::String(mv) = &mod_spec.value {
                        if mv.contains('{') {
                            let mut v = HashSet::new();
                            mod_spec.value = Value::String(resolve_alias_recursive(mv, found_set, opt_index, &mut v, 0));
                        }
                    }
                    let (mod_res, _) = apply_color_modifier_internal(
                        &resolved_str,
                        &mod_spec,
                        resolved_mix.as_deref(),
                    );
                    resolved_str = mod_res;
                }
                let is_alias = raw_str.contains('{') && raw_str.contains('}');
                let mut token_path = Vec::with_capacity(path_segments.len() + 1);
                token_path.push(found_set.to_string());
                token_path.extend(path_segments.iter().cloned());

                let cell = MatrixCellData {
                    raw_value: raw_val,
                    resolved_value: Value::String(resolved_str),
                    is_alias,
                    token_path,
                    set_name: found_set.to_string(),
                };
                if let Ok(cell_val) = serde_json::to_value(cell) {
                    cells.insert(opt.name.clone(), cell_val);
                }
            }
        }

        let category = get_category_for_type(&tok_type).to_string();
        rows.push(MatrixRowData {
            token_key,
            token_type: tok_type,
            group: tok_group,
            category,
            cells,
        });
    }

    rows.sort_by(|a, b| a.token_key.to_ascii_lowercase().cmp(&b.token_key.to_ascii_lowercase()));

    serde_json::to_string(&rows)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize matrix rows: {e}")))
}

// ============================================================================
// Token Diff Engine (tokenDiff.ts parity)
// ============================================================================

#[derive(Debug, Clone)]
struct FlatTokenMeta {
    value: Value,
    token_type: String,
    description: Option<String>,
}

fn extract_tokens_flat_map(
    obj: Option<&Value>,
    prefix: &mut Vec<String>,
    out: &mut HashMap<String, FlatTokenMeta>,
) {
    let Some(Value::Object(map)) = obj else {
        return;
    };
    for (key, val) in map {
        if key.starts_with('$') {
            continue;
        }
        if let Value::Object(child_map) = val {
            if child_map.contains_key("value") || child_map.contains_key("$value") {
                let raw_val = child_map
                    .get("value")
                    .or_else(|| child_map.get("$value"))
                    .cloned()
                    .unwrap_or(Value::Null);
                let token_type = child_map
                    .get("type")
                    .or_else(|| child_map.get("$type"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                let description = child_map
                    .get("description")
                    .or_else(|| child_map.get("$description"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                let full_key = if prefix.is_empty() {
                    key.clone()
                } else {
                    format!("{}.{}", prefix.join("."), key)
                };
                out.insert(
                    full_key,
                    FlatTokenMeta {
                        value: raw_val,
                        token_type,
                        description,
                    },
                );
            } else {
                prefix.push(key.clone());
                extract_tokens_flat_map(Some(val), prefix, out);
                prefix.pop();
            }
        }
    }
}

fn compute_line_diff_internal(old_str: &str, new_str: &str) -> Vec<LineDiffChunk> {
    let old_lines: Vec<&str> = if old_str.is_empty() {
        Vec::new()
    } else {
        old_str.split('\n').collect()
    };
    let new_lines: Vec<&str> = if new_str.is_empty() {
        Vec::new()
    } else {
        new_str.split('\n').collect()
    };

    let mut chunks = Vec::new();
    let mut old_idx = 0usize;
    let mut new_idx = 0usize;

    while old_idx < old_lines.len() || new_idx < new_lines.len() {
        if old_idx < old_lines.len()
            && new_idx < new_lines.len()
            && old_lines[old_idx] == new_lines[new_idx]
        {
            chunks.push(LineDiffChunk {
                chunk_type: "unchanged".to_string(),
                content: old_lines[old_idx].to_string(),
                old_line_number: Some(old_idx + 1),
                new_line_number: Some(new_idx + 1),
            });
            old_idx += 1;
            new_idx += 1;
        } else if new_idx >= new_lines.len() {
            chunks.push(LineDiffChunk {
                chunk_type: "removed".to_string(),
                content: old_lines[old_idx].to_string(),
                old_line_number: Some(old_idx + 1),
                new_line_number: None,
            });
            old_idx += 1;
        } else if old_idx >= old_lines.len() {
            chunks.push(LineDiffChunk {
                chunk_type: "added".to_string(),
                content: new_lines[new_idx].to_string(),
                old_line_number: None,
                new_line_number: Some(new_idx + 1),
            });
            new_idx += 1;
        } else {
            let mut found_match = false;
            for offset in 1..6 {
                if new_idx + offset < new_lines.len()
                    && old_lines[old_idx] == new_lines[new_idx + offset]
                {
                    for i in 0..offset {
                        chunks.push(LineDiffChunk {
                            chunk_type: "added".to_string(),
                            content: new_lines[new_idx + i].to_string(),
                            old_line_number: None,
                            new_line_number: Some(new_idx + i + 1),
                        });
                    }
                    new_idx += offset;
                    found_match = true;
                    break;
                } else if old_idx + offset < old_lines.len()
                    && old_lines[old_idx + offset] == new_lines[new_idx]
                {
                    for i in 0..offset {
                        chunks.push(LineDiffChunk {
                            chunk_type: "removed".to_string(),
                            content: old_lines[old_idx + i].to_string(),
                            old_line_number: Some(old_idx + i + 1),
                            new_line_number: None,
                        });
                    }
                    old_idx += offset;
                    found_match = true;
                    break;
                }
            }
            if !found_match {
                chunks.push(LineDiffChunk {
                    chunk_type: "removed".to_string(),
                    content: old_lines[old_idx].to_string(),
                    old_line_number: Some(old_idx + 1),
                    new_line_number: None,
                });
                chunks.push(LineDiffChunk {
                    chunk_type: "added".to_string(),
                    content: new_lines[new_idx].to_string(),
                    old_line_number: None,
                    new_line_number: Some(new_idx + 1),
                });
                old_idx += 1;
                new_idx += 1;
            }
        }
    }

    chunks
}

#[wasm_bindgen]
pub fn compute_tokens_diff_json(
    original_doc_json: &str,
    updated_doc_json: &str,
    sync_meta_files_json: Option<String>,
) -> Result<String, JsValue> {
    let orig_val: Value = serde_json::from_str(original_doc_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid original doc JSON: {e}")))?;
    let upd_val: Value = serde_json::from_str(updated_doc_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid updated doc JSON: {e}")))?;
    let sync_files: HashMap<String, String> = sync_meta_files_json
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    let empty_map = Map::new();
    let orig_map = orig_val.as_object().unwrap_or(&empty_map);
    let upd_map = upd_val.as_object().unwrap_or(&empty_map);

    let mut all_set_keys: Vec<String> = Vec::new();
    let mut seen_sets: HashSet<String> = HashSet::new();
    for k in orig_map.keys().chain(upd_map.keys()) {
        if seen_sets.insert(k.clone()) {
            all_set_keys.push(k.clone());
        }
    }

    let mut files: Vec<FileDiffItem> = Vec::new();
    let mut total_added = 0usize;
    let mut total_modified = 0usize;
    let mut total_deleted = 0usize;

    for set_key in all_set_keys {
        let old_set = orig_map.get(&set_key);
        let new_set = upd_map.get(&set_key);

        let old_json = match old_set {
            Some(v) => serde_json::to_string_pretty(v).unwrap_or_default(),
            None => String::new(),
        };
        let new_json = match new_set {
            Some(v) => serde_json::to_string_pretty(v).unwrap_or_default(),
            None => String::new(),
        };
        if old_json.trim() == new_json.trim() {
            continue;
        }

        let file_name = sync_files
            .get(&set_key)
            .cloned()
            .unwrap_or_else(|| format!("{set_key}.json"));
        let change_type = if old_set.is_none() && new_set.is_some() {
            "added"
        } else if old_set.is_some() && new_set.is_none() {
            "deleted"
        } else {
            "modified"
        }
        .to_string();

        let mut old_flat = HashMap::new();
        let mut new_flat = HashMap::new();
        let mut prefix = Vec::new();
        extract_tokens_flat_map(old_set, &mut prefix, &mut old_flat);
        prefix.clear();
        extract_tokens_flat_map(new_set, &mut prefix, &mut new_flat);

        let mut all_tokens: Vec<String> = Vec::new();
        let mut seen_tok = HashSet::new();
        for k in old_flat.keys().chain(new_flat.keys()) {
            if seen_tok.insert(k.clone()) {
                all_tokens.push(k.clone());
            }
        }
        all_tokens.sort();

        let mut token_diffs = Vec::new();
        let mut set_added = 0usize;
        let mut set_modified = 0usize;
        let mut set_deleted = 0usize;

        for t_key in all_tokens {
            match (old_flat.get(&t_key), new_flat.get(&t_key)) {
                (None, Some(new_t)) => {
                    token_diffs.push(TokenDiffItem {
                        key: t_key.clone(),
                        name: t_key,
                        set_name: set_key.clone(),
                        token_type: new_t.token_type.clone(),
                        change_type: "added".to_string(),
                        old_value: None,
                        new_value: Some(new_t.value.clone()),
                        old_description: None,
                        new_description: new_t.description.clone(),
                    });
                    set_added += 1;
                }
                (Some(old_t), None) => {
                    token_diffs.push(TokenDiffItem {
                        key: t_key.clone(),
                        name: t_key,
                        set_name: set_key.clone(),
                        token_type: old_t.token_type.clone(),
                        change_type: "deleted".to_string(),
                        old_value: Some(old_t.value.clone()),
                        new_value: None,
                        old_description: old_t.description.clone(),
                        new_description: None,
                    });
                    set_deleted += 1;
                }
                (Some(old_t), Some(new_t)) => {
                    let val_changed = old_t.value != new_t.value;
                    let desc_changed = old_t.description.as_deref().unwrap_or("")
                        != new_t.description.as_deref().unwrap_or("");
                    let type_changed = old_t.token_type != new_t.token_type;
                    if val_changed || desc_changed || type_changed {
                        token_diffs.push(TokenDiffItem {
                            key: t_key.clone(),
                            name: t_key,
                            set_name: set_key.clone(),
                            token_type: new_t.token_type.clone(),
                            change_type: "modified".to_string(),
                            old_value: Some(old_t.value.clone()),
                            new_value: Some(new_t.value.clone()),
                            old_description: old_t.description.clone(),
                            new_description: new_t.description.clone(),
                        });
                        set_modified += 1;
                    }
                }
                _ => {}
            }
        }

        let line_diff = compute_line_diff_internal(&old_json, &new_json);
        total_added += set_added;
        total_modified += set_modified;
        total_deleted += set_deleted;

        files.push(FileDiffItem {
            file_name,
            set_name: set_key,
            old_json,
            new_json,
            change_type,
            tokens: token_diffs,
            line_diff,
            added_count: set_added,
            modified_count: set_modified,
            deleted_count: set_deleted,
        });
    }

    let summary = DocumentDiffSummary {
        has_changes: !files.is_empty(),
        files,
        total_added,
        total_modified,
        total_deleted,
    };

    serde_json::to_string(&summary)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize diff summary: {e}")))
}

// ============================================================================
// Pure-Rust Standard PKZIP Builder (Zero external crates)
// ============================================================================

fn crc32_ieee(data: &[u8]) -> u32 {
    let mut crc: u32 = 0xFFFF_FFFF;
    for &byte in data {
        crc ^= byte as u32;
        for _ in 0..8 {
            let mask = (crc & 1).wrapping_neg();
            crc = (crc >> 1) ^ (0xEDB8_8320 & mask);
        }
    }
    !crc
}

#[wasm_bindgen]
pub fn build_zip_archive(files_json: &str) -> Result<Vec<u8>, JsValue> {
    let files: Vec<ZipInputFile> = serde_json::from_str(files_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid zip files JSON: {e}")))?;

    let mut out: Vec<u8> = Vec::new();
    let mut central_dir: Vec<u8> = Vec::new();
    let mut entry_count: u16 = 0;

    for file in &files {
        let entry_name = if !file.path.is_empty() {
            file.path.as_str()
        } else {
            file.name.as_str()
        };
        if entry_name.is_empty() {
            continue;
        }
        let name_bytes = entry_name.as_bytes();
        let data = file.content.as_bytes();
        let crc = crc32_ieee(data);
        let size = data.len() as u32;
        let name_len = name_bytes.len() as u16;
        let local_offset = out.len() as u32;

        // Local File Header (30 bytes + name)
        out.extend_from_slice(&0x0403_4B50u32.to_le_bytes()); // signature
        out.extend_from_slice(&20u16.to_le_bytes()); // version needed (2.0)
        out.extend_from_slice(&0x0800u16.to_le_bytes()); // UTF-8 flag
        out.extend_from_slice(&0u16.to_le_bytes()); // compression method (0 = stored)
        out.extend_from_slice(&0u16.to_le_bytes()); // mod time
        out.extend_from_slice(&0x5421u16.to_le_bytes()); // mod date
        out.extend_from_slice(&crc.to_le_bytes());
        out.extend_from_slice(&size.to_le_bytes()); // compressed size
        out.extend_from_slice(&size.to_le_bytes()); // uncompressed size
        out.extend_from_slice(&name_len.to_le_bytes());
        out.extend_from_slice(&0u16.to_le_bytes()); // extra len
        out.extend_from_slice(name_bytes);
        out.extend_from_slice(data);

        // Central Directory Header (46 bytes + name)
        central_dir.extend_from_slice(&0x0201_4B50u32.to_le_bytes());
        central_dir.extend_from_slice(&20u16.to_le_bytes()); // version made by
        central_dir.extend_from_slice(&20u16.to_le_bytes()); // version needed
        central_dir.extend_from_slice(&0x0800u16.to_le_bytes()); // UTF-8 flag
        central_dir.extend_from_slice(&0u16.to_le_bytes()); // stored
        central_dir.extend_from_slice(&0u16.to_le_bytes()); // mod time
        central_dir.extend_from_slice(&0x5421u16.to_le_bytes()); // mod date
        central_dir.extend_from_slice(&crc.to_le_bytes());
        central_dir.extend_from_slice(&size.to_le_bytes());
        central_dir.extend_from_slice(&size.to_le_bytes());
        central_dir.extend_from_slice(&name_len.to_le_bytes());
        central_dir.extend_from_slice(&0u16.to_le_bytes()); // extra len
        central_dir.extend_from_slice(&0u16.to_le_bytes()); // comment len
        central_dir.extend_from_slice(&0u16.to_le_bytes()); // disk number
        central_dir.extend_from_slice(&0u16.to_le_bytes()); // internal attrs
        central_dir.extend_from_slice(&0u32.to_le_bytes()); // external attrs
        central_dir.extend_from_slice(&local_offset.to_le_bytes());
        central_dir.extend_from_slice(name_bytes);

        entry_count = entry_count.saturating_add(1);
    }

    let cd_offset = out.len() as u32;
    let cd_size = central_dir.len() as u32;
    out.extend_from_slice(&central_dir);

    // End of Central Directory Record (22 bytes)
    out.extend_from_slice(&0x0605_4B50u32.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes()); // disk
    out.extend_from_slice(&0u16.to_le_bytes()); // cd start disk
    out.extend_from_slice(&entry_count.to_le_bytes());
    out.extend_from_slice(&entry_count.to_le_bytes());
    out.extend_from_slice(&cd_size.to_le_bytes());
    out.extend_from_slice(&cd_offset.to_le_bytes());
    out.extend_from_slice(&0u16.to_le_bytes()); // comment len

    Ok(out)
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flattens_resolves_alias_and_embedded_ref() {
        let input = r##"{
          "core": { "brand": { "primary": { "$value": "#2563eb", "$type": "color" } } },
          "semantic": {
            "btn": { "$value": "{brand.primary}", "$type": "color" },
            "border": { "$value": "1px solid {brand.primary}", "$type": "other" }
          }
        }"##;
        let out_json = flatten_and_resolve_tokens_json(input, None, None).unwrap();
        let parsed: Vec<FlattenedToken> = serde_json::from_str(&out_json).unwrap();
        let btn = parsed.iter().find(|t| t.name == "btn").unwrap();
        assert_eq!(btn.resolved_value, "#2563eb");
        assert_eq!(btn.resolved_hex.as_deref(), Some("#2563eb"));
        assert!(btn.is_alias);
        let border = parsed.iter().find(|t| t.name == "border").unwrap();
        assert_eq!(border.resolved_value, "1px solid #2563eb");
    }

    #[test]
    fn applies_color_modifiers_in_lch_and_oklch() {
        let mod_json = r#"{"type":"lighten","value":"0.5","space":"lch","format":"hex"}"#;
        let res = apply_color_modifier_json("#2563eb", mod_json, None).unwrap();
        let v: Value = serde_json::from_str(&res).unwrap();
        let hex = v["hex"].as_str().unwrap();
        assert!(hex.starts_with('#') && hex.len() == 7);
        assert_ne!(hex, "#2563eb");

        let alpha_mod = r#"{"type":"alpha","value":"0.5","format":"rgba"}"#;
        let alpha_res = apply_color_modifier_json("#000000", alpha_mod, None).unwrap();
        let av: Value = serde_json::from_str(&alpha_res).unwrap();
        assert_eq!(av["resolvedValue"].as_str().unwrap(), "rgba(0, 0, 0, 0.5)");
    }

    #[test]
    fn builds_theme_matrix_across_options() {
        let doc = r##"{
          "light": { "bg": { "$value": "#ffffff", "$type": "color" } },
          "dark": { "bg": { "$value": "#000000", "$type": "color" } }
        }"##;
        let group = r#"{
          "id": "theme",
          "name": "Theme",
          "options": [
            { "id": "opt_light", "name": "Light", "selectedTokenSets": { "light": "enabled", "dark": "disabled" } },
            { "id": "opt_dark", "name": "Dark", "selectedTokenSets": { "dark": "enabled", "light": "disabled" } }
          ]
        }"#;
        let matrix_json = build_theme_matrix_json(doc, group, None, None).unwrap();
        let rows: Vec<Value> = serde_json::from_str(&matrix_json).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0]["tokenKey"].as_str(), Some("bg"));
        assert_eq!(rows[0]["cells"]["Light"]["resolvedValue"].as_str(), Some("#ffffff"));
        assert_eq!(rows[0]["cells"]["Dark"]["resolvedValue"].as_str(), Some("#000000"));
    }

    #[test]
    fn computes_semantic_and_line_diff() {
        let old_doc = r##"{"core":{"a":{"$value":"#111111","$type":"color"}}}"##;
        let new_doc = r##"{"core":{"a":{"$value":"#222222","$type":"color"},"b":{"$value":"8px","$type":"spacing"}}}"##;
        let diff_json = compute_tokens_diff_json(old_doc, new_doc, None).unwrap();
        let v: Value = serde_json::from_str(&diff_json).unwrap();
        assert_eq!(v["hasChanges"].as_bool(), Some(true));
        assert_eq!(v["totalAdded"].as_u64(), Some(1));
        assert_eq!(v["totalModified"].as_u64(), Some(1));
        assert_eq!(v["totalDeleted"].as_u64(), Some(0));
    }

    #[test]
    fn builds_valid_pkzip_archive() {
        let files = r#"[{"path":"css/tokens.css","content":":root { --a: 1px; }\n"}]"#;
        let bytes = build_zip_archive(files).unwrap();
        assert_eq!(&bytes[0..4], b"PK\x03\x04");
        assert!(bytes.windows(4).any(|w| w == b"PK\x05\x06"));
    }
}
