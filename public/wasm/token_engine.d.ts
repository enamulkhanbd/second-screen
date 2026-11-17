/* tslint:disable */
/* eslint-disable */

export function apply_color_modifier_json(base_color: string, modifier_json: string, resolved_mix_color?: string | null): string;

export function build_theme_matrix_json(raw_doc_json: string, group_json: string, active_option_ids_json?: string | null, all_groups_json?: string | null): string;

export function build_zip_archive(files_json: string): Uint8Array;

export function compute_tokens_diff_json(original_doc_json: string, updated_doc_json: string, sync_meta_files_json?: string | null): string;

/**
 * Fast WASM entry point to flatten a DTCG RawTokensDocument JSON string and resolve aliases/themes/modifiers.
 */
export function flatten_and_resolve_tokens_json(raw_doc_json: string, selected_set?: string | null, theme_config_json?: string | null): string;

export function format_color_value_wasm(val: string, color_space: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly apply_color_modifier_json: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly build_theme_matrix_json: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
    readonly build_zip_archive: (a: number, b: number) => [number, number, number, number];
    readonly compute_tokens_diff_json: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly flatten_and_resolve_tokens_json: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly format_color_value_wasm: (a: number, b: number, c: number, d: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
