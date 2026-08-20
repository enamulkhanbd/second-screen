import { RawTokensDocument } from "@/types/tokens";

export interface StarterTemplate {
  id: string;
  name: string;
  category: "saas" | "ecommerce" | "mobile" | "accessible";
  tagline: string;
  description: string;
  swatches: string[];
  tokenCount: number;
  setsCount: number;
  themesCount: number;
  tokensDoc: RawTokensDocument;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "saas-modern",
    name: "SaaS Modern Design System",
    category: "saas",
    tagline: "Sleek, modular foundation for modern web applications & dashboards",
    description:
      "Includes a 10-shade violet & slate palette, modular Inter typography scale, 8-point spatial grid, and Light & Dark theme modes.",
    swatches: ["#7c3aed", "#6366f1", "#0f172a", "#f8fafc"],
    tokenCount: 42,
    setsCount: 4,
    themesCount: 2,
    tokensDoc: {
      global: {
        colors: {
          brand: {
            primary: { value: "#7c3aed", type: "color", description: "Primary violet accent" },
            secondary: { value: "#6366f1", type: "color", description: "Indigo supporting tint" },
            hover: { value: "#6d28d9", type: "color", description: "Darker violet hover state" },
          },
          slate: {
            50: { value: "#f8fafc", type: "color" },
            100: { value: "#f1f5f9", type: "color" },
            200: { value: "#e2e8f0", type: "color" },
            800: { value: "#1e293b", type: "color" },
            900: { value: "#0f172a", type: "color" },
            950: { value: "#020617", type: "color" },
          },
          success: { value: "#10b981", type: "color" },
          warning: { value: "#f59e0b", type: "color" },
          error: { value: "#ef4444", type: "color" },
        },
        spacing: {
          xs: { value: "4px", type: "spacing" },
          sm: { value: "8px", type: "spacing" },
          md: { value: "16px", type: "spacing" },
          lg: { value: "24px", type: "spacing" },
          xl: { value: "32px", type: "spacing" },
          "2xl": { value: "48px", type: "spacing" },
        },
        radii: {
          sm: { value: "6px", type: "borderRadius" },
          md: { value: "10px", type: "borderRadius" },
          lg: { value: "16px", type: "borderRadius" },
          full: { value: "9999px", type: "borderRadius" },
        },
        fontFamilies: {
          primary: { value: "Inter, sans-serif", type: "fontFamilies" },
          mono: { value: "JetBrains Mono, monospace", type: "fontFamilies" },
        },
        fontSizes: {
          sm: { value: "12px", type: "fontSizes" },
          base: { value: "14px", type: "fontSizes" },
          md: { value: "16px", type: "fontSizes" },
          lg: { value: "20px", type: "fontSizes" },
          xl: { value: "24px", type: "fontSizes" },
          "2xl": { value: "32px", type: "fontSizes" },
        },
      },
      "typography/global": {
        heading: {
          h1: {
            value: {
              fontFamily: "{fontFamilies.primary}",
              fontWeight: "700",
              fontSize: "{fontSizes.2xl}",
              lineHeight: "40px",
            },
            type: "typography",
            description: "Primary page title",
          },
          h2: {
            value: {
              fontFamily: "{fontFamilies.primary}",
              fontWeight: "600",
              fontSize: "{fontSizes.xl}",
              lineHeight: "32px",
            },
            type: "typography",
          },
          h3: {
            value: {
              fontFamily: "{fontFamilies.primary}",
              fontWeight: "600",
              fontSize: "{fontSizes.lg}",
              lineHeight: "28px",
            },
            type: "typography",
          },
        },
        body: {
          md: {
            value: {
              fontFamily: "{fontFamilies.primary}",
              fontWeight: "400",
              fontSize: "{fontSizes.base}",
              lineHeight: "20px",
            },
            type: "typography",
          },
          sm: {
            value: {
              fontFamily: "{fontFamilies.primary}",
              fontWeight: "400",
              fontSize: "{fontSizes.sm}",
              lineHeight: "16px",
            },
            type: "typography",
          },
        },
      },
      "themes/light": {
        surface: {
          canvas: { value: "{colors.slate.50}", type: "color" },
          card: { value: "#ffffff", type: "color" },
          border: { value: "{colors.slate.200}", type: "color" },
        },
        text: {
          primary: { value: "{colors.slate.900}", type: "color" },
          muted: { value: "#64748b", type: "color" },
        },
      },
      "themes/dark": {
        surface: {
          canvas: { value: "{colors.slate.950}", type: "color" },
          card: { value: "{colors.slate.900}", type: "color" },
          border: { value: "{colors.slate.800}", type: "color" },
        },
        text: {
          primary: { value: "#ffffff", type: "color" },
          muted: { value: "#94a3b8", type: "color" },
        },
      },
      $themes: [
        {
          id: "theme-light",
          name: "Light",
          group: "Mode",
          selectedTokenSets: {
            global: "source",
            "typography/global": "enabled",
            "themes/light": "enabled",
            "themes/dark": "disabled",
          },
        },
        {
          id: "theme-dark",
          name: "Dark",
          group: "Mode",
          selectedTokenSets: {
            global: "source",
            "typography/global": "enabled",
            "themes/light": "disabled",
            "themes/dark": "enabled",
          },
        },
      ],
      $metadata: {
        tokenSetOrder: ["global", "typography/global", "themes/light", "themes/dark"],
      },
    },
  },
  {
    id: "ecommerce-store",
    name: "E-Commerce & Retail System",
    category: "ecommerce",
    tagline: "Vibrant merchandising tokens, conversion buttons, and dense product grids",
    description:
      "Engineered for high conversion with emerald deal badges, amber star ratings, clear price typography, and sharp border radii.",
    swatches: ["#059669", "#d97706", "#dc2626", "#18181b"],
    tokenCount: 38,
    setsCount: 3,
    themesCount: 2,
    tokensDoc: {
      global: {
        colors: {
          accent: {
            emerald: { value: "#059669", type: "color", description: "Buy action & stock available" },
            amber: { value: "#d97706", type: "color", description: "Ratings & limited deals" },
            sale: { value: "#dc2626", type: "color", description: "Clearance & discounts" },
          },
          neutral: {
            white: { value: "#ffffff", type: "color" },
            gray50: { value: "#fafafa", type: "color" },
            gray200: { value: "#e4e4e7", type: "color" },
            gray900: { value: "#18181b", type: "color" },
          },
        },
        spacing: {
          tight: { value: "4px", type: "spacing" },
          compact: { value: "8px", type: "spacing" },
          comfortable: { value: "16px", type: "spacing" },
          loose: { value: "24px", type: "spacing" },
        },
        radii: {
          button: { value: "8px", type: "borderRadius" },
          badge: { value: "4px", type: "borderRadius" },
          card: { value: "12px", type: "borderRadius" },
        },
      },
      "themes/default": {
        button: {
          primaryBg: { value: "{colors.accent.emerald}", type: "color" },
          primaryText: { value: "#ffffff", type: "color" },
        },
        price: {
          current: { value: "{colors.accent.sale}", type: "color" },
          original: { value: "#71717a", type: "color" },
        },
      },
      $themes: [
        {
          id: "theme-default",
          name: "Default Store",
          group: "Brand",
          selectedTokenSets: {
            global: "source",
            "themes/default": "enabled",
          },
        },
      ],
      $metadata: {
        tokenSetOrder: ["global", "themes/default"],
      },
    },
  },
  {
    id: "mobile-first",
    name: "Mobile-First (iOS & Android)",
    category: "mobile",
    tagline: "Tailored for native touch targets, fluid densities, and mobile typography scales",
    description:
      "Includes 44pt/48pt tap targets, iOS rounded shapes, Android Material elevations, and responsive typography scales.",
    swatches: ["#0284c7", "#0ea5e9", "#f0f9ff", "#0c4a6e"],
    tokenCount: 32,
    setsCount: 3,
    themesCount: 2,
    tokensDoc: {
      global: {
        colors: {
          sky: {
            primary: { value: "#0284c7", type: "color" },
            light: { value: "#e0f2fe", type: "color" },
            dark: { value: "#075985", type: "color" },
          },
        },
        sizing: {
          touchTargetMin: { value: "44px", type: "sizing", description: "iOS standard touch target" },
          touchTargetLarge: { value: "48px", type: "sizing", description: "Android standard touch target" },
          navbarHeight: { value: "56px", type: "sizing" },
        },
        radii: {
          sheet: { value: "20px", type: "borderRadius" },
          pill: { value: "9999px", type: "borderRadius" },
        },
      },
      "platforms/ios": {
        colors: {
          tint: { value: "{colors.sky.primary}", type: "color" },
        },
      },
      "platforms/android": {
        colors: {
          tint: { value: "{colors.sky.primary}", type: "color" },
        },
      },
      $themes: [
        {
          id: "platform-ios",
          name: "iOS Native",
          group: "Platform",
          selectedTokenSets: {
            global: "source",
            "platforms/ios": "enabled",
            "platforms/android": "disabled",
          },
        },
        {
          id: "platform-android",
          name: "Android Native",
          group: "Platform",
          selectedTokenSets: {
            global: "source",
            "platforms/ios": "disabled",
            "platforms/android": "enabled",
          },
        },
      ],
      $metadata: {
        tokenSetOrder: ["global", "platforms/ios", "platforms/android"],
      },
    },
  },
  {
    id: "accessible-high-contrast",
    name: "Accessible High-Contrast (WCAG AAA)",
    category: "accessible",
    tagline: "Strict 7:1+ contrast ratios for government, healthcare, and enterprise compliance",
    description:
      "Guarantees 100% WCAG AAA pass rates across all color pairings with distinct focus rings, large typography, and sharp borders.",
    swatches: ["#000000", "#ffffff", "#0047ab", "#ffd700"],
    tokenCount: 28,
    setsCount: 2,
    themesCount: 2,
    tokensDoc: {
      global: {
        colors: {
          pureBlack: { value: "#000000", type: "color" },
          pureWhite: { value: "#ffffff", type: "color" },
          highContrastBlue: { value: "#003399", type: "color" },
          focusYellow: { value: "#ffd700", type: "color" },
        },
        borders: {
          focusWidth: { value: "3px", type: "dimension" },
          standard: { value: "2px", type: "dimension" },
        },
      },
      "themes/high-contrast": {
        surface: {
          canvas: { value: "{colors.pureBlack}", type: "color" },
          card: { value: "#121212", type: "color" },
          border: { value: "{colors.pureWhite}", type: "color" },
        },
        text: {
          primary: { value: "{colors.pureWhite}", type: "color" },
        },
      },
      $themes: [
        {
          id: "theme-aaa",
          name: "High Contrast AAA",
          group: "Accessibility",
          selectedTokenSets: {
            global: "source",
            "themes/high-contrast": "enabled",
          },
        },
      ],
      $metadata: {
        tokenSetOrder: ["global", "themes/high-contrast"],
      },
    },
  },
];
