import { RawTokensDocument } from "@/types/tokens";

export const SAMPLE_TOKENS_DATA: RawTokensDocument = {
  $themes: [
    {
      id: "theme-semantic",
      name: "Default",
      group: "Semantic",
      selectedTokenSets: { global: "enabled" },
    },
    {
      id: "theme-components",
      name: "Default",
      group: "Components",
      selectedTokenSets: { components: "enabled" },
    },
    {
      id: "theme-dark",
      name: "Dark",
      group: "Theme",
      selectedTokenSets: { global: "enabled", dark: "enabled" },
    },
    {
      id: "theme-light",
      name: "Light",
      group: "Theme",
      selectedTokenSets: { global: "enabled", light: "enabled" },
    },
    {
      id: "theme-brand-1",
      name: "Atlas Connect",
      group: "Brands",
      selectedTokenSets: { global: "enabled", dark: "enabled" },
    },
    {
      id: "theme-brand-2",
      name: "Atlas Educate",
      group: "Brands",
      selectedTokenSets: { global: "enabled", light: "enabled" },
    },
  ] as any,

  global: {
    brand: {
      color: {
        palette: {
          brand: {
            "300": { value: "#93c5fd", type: "color" },
            "400": { value: "#60a5fa", type: "color" },
            "500": { value: "#22c55e", type: "color" }, // Green accent in reference
            "600": { value: "#16a34a", type: "color" },
            "700": { value: "#15803d", type: "color" },
            "800": { value: "#166534", type: "color" },
          },
          gray: {
            "0": { value: "#ffffff", type: "color" },
            "25": { value: "#f8fafc", type: "color" },
            "50": { value: "#f1f5f9", type: "color" },
            "100": { value: "#e2e8f0", type: "color" },
            "200": { value: "#cbd5e1", type: "color" },
            "300": { value: "#94a3b8", type: "color" },
            "400": { value: "#64748b", type: "color" },
            "700": { value: "#334155", type: "color" },
            "800": { value: "#1e293b", type: "color" },
            "900": { value: "#0f172a", type: "color" },
            "920": { value: "#0b1329", type: "color" },
            "950": { value: "#020617", type: "color" },
          },
          danger: {
            "50": { value: "#fff1f2", type: "color" },
            "900": { value: "#881337", type: "color" },
          },
          info: {
            "50": { value: "#f0f9ff", type: "color" },
            "920": { value: "#0c2847", type: "color" },
          },
          success: {
            "50": { value: "#f0fdf4", type: "color" },
            "900": { value: "#14532d", type: "color" },
          },
          warning: {
            "50": { value: "#fffbeb", type: "color" },
            "900": { value: "#78350f", type: "color" },
          },
        },
      },
    },
    color: {
      palette: {
        alpha: {
          "black 24": { value: "rgba(0, 0, 0, 0.24)", type: "color" },
        },
      },
    },
  },

  dark: {
    color: {
      semantic: {
        bg: {
          brandStrong: { value: "{brand.color.palette.brand.500}", type: "color" },
          brandSubtle: { value: "{brand.color.palette.brand.800}", type: "color" },
          canvas: { value: "{brand.color.palette.gray.950}", type: "color" },
          dangerSubtle: { value: "{brand.color.palette.danger.900}", type: "color" },
          infoSubtle: { value: "{brand.color.palette.info.920}", type: "color" },
          inverse: { value: "{brand.color.palette.gray.0}", type: "color" },
          muted: { value: "{brand.color.palette.gray.700}", type: "color" },
          overlay: { value: "{color.palette.alpha.black 24}", type: "color" },
          subtle: { value: "{brand.color.palette.gray.800}", type: "color" },
          successSubtle: { value: "{brand.color.palette.success.900}", type: "color" },
          sunken: { value: "{brand.color.palette.gray.950}", type: "color" },
          surface: { value: "{brand.color.palette.gray.920}", type: "color" },
          surfaceRaised: { value: "{brand.color.palette.gray.820}", type: "color" },
          warningSubtle: { value: "{brand.color.palette.warning.900}", type: "color" },
        },
        border: {
          brand: { value: "{brand.color.palette.brand.700}", type: "color" },
          default: { value: "{brand.color.palette.gray.700}", type: "color" },
          focus: { value: "{brand.color.palette.brand.400}", type: "color" },
          inverse: { value: "{brand.color.palette.gray.200}", type: "color" },
          strong: { value: "{brand.color.palette.gray.600}", type: "color" },
          subtle: { value: "{brand.color.palette.gray.820}", type: "color" },
        },
        brand: {
          border: { value: "{brand.color.palette.brand.700}", type: "color" },
          solid: { value: "{brand.color.palette.brand.500}", type: "color" },
          solidActive: { value: "{brand.color.palette.brand.300}", type: "color" },
          solidHover: { value: "{brand.color.palette.brand.400}", type: "color" },
          subtle: { value: "{brand.color.palette.brand.900}", type: "color" },
          subtleHover: { value: "{brand.color.palette.brand.800}", type: "color" },
          text: { value: "{brand.color.palette.brand.300}", type: "color" },
        },
        icon: {
          brand: { value: "{colorMode.text.brand}", type: "color" },
          inverse: { value: "{colorMode.text.inverse}", type: "color" },
          primary: { value: "{colorMode.text.primary}", type: "color" },
          secondary: { value: "{colorMode.text.secondary}", type: "color" },
        },
      },
    },
  },

  light: {
    color: {
      semantic: {
        bg: {
          brandStrong: { value: "{brand.color.palette.brand.600}", type: "color" },
          brandSubtle: { value: "{brand.color.palette.brand.50}", type: "color" },
          canvas: { value: "{brand.color.palette.gray.0}", type: "color" },
          dangerSubtle: { value: "{brand.color.palette.danger.50}", type: "color" },
          infoSubtle: { value: "{brand.color.palette.info.50}", type: "color" },
          inverse: { value: "{brand.color.palette.gray.900}", type: "color" },
          muted: { value: "{brand.color.palette.gray.100}", type: "color" },
          overlay: { value: "{color.palette.alpha.black 24}", type: "color" },
          subtle: { value: "{brand.color.palette.gray.50}", type: "color" },
          successSubtle: { value: "{brand.color.palette.success.50}", type: "color" },
          sunken: { value: "{brand.color.palette.gray.100}", type: "color" },
          surface: { value: "{brand.color.palette.gray.25}", type: "color" },
          surfaceRaised: { value: "{brand.color.palette.gray.0}", type: "color" },
          warningSubtle: { value: "{brand.color.palette.warning.50}", type: "color" },
        },
        border: {
          brand: { value: "{brand.color.palette.brand.300}", type: "color" },
          default: { value: "{brand.color.palette.gray.200}", type: "color" },
          focus: { value: "{brand.color.palette.brand.500}", type: "color" },
          inverse: { value: "{brand.color.palette.gray.700}", type: "color" },
          strong: { value: "{brand.color.palette.gray.300}", type: "color" },
          subtle: { value: "{brand.color.palette.gray.100}", type: "color" },
        },
        brand: {
          border: { value: "{brand.color.palette.brand.300}", type: "color" },
          solid: { value: "{brand.color.palette.brand.600}", type: "color" },
          solidActive: { value: "{brand.color.palette.brand.800}", type: "color" },
          solidHover: { value: "{brand.color.palette.brand.700}", type: "color" },
          subtle: { value: "{brand.color.palette.brand.50}", type: "color" },
          subtleHover: { value: "{brand.color.palette.brand.100}", type: "color" },
          text: { value: "{brand.color.palette.brand.700}", type: "color" },
        },
        icon: {
          brand: { value: "{colorMode.text.brand}", type: "color" },
          inverse: { value: "{colorMode.text.inverse}", type: "color" },
          primary: { value: "{colorMode.text.primary}", type: "color" },
          secondary: { value: "{colorMode.text.secondary}", type: "color" },
        },
      },
    },
  },
};
