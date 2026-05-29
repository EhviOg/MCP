/** Templates for generating React Native code from a prompt/idea. */

function toPascalCase(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");
}

export function componentFileName(name: string): string {
  return `${toPascalCase(name)}.tsx`;
}

export function componentTemplate(name: string, description?: string): string {
  const comp = toPascalCase(name);
  const doc = description ? `\n * ${description}\n *` : "";
  return `import { StyleSheet, Text, View } from "react-native";

/**
 * ${comp}${doc}
 */
export type ${comp}Props = {
  title?: string;
};

export function ${comp}({ title = "${comp}" }: ${comp}Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
});
`;
}

/** A screen file for Expo Router (lives under app/ or src/app/). */
export function screenTemplate(name: string, description?: string): string {
  const comp = toPascalCase(name);
  const doc = description ? `\n * ${description}\n *` : "";
  return `import { StyleSheet, Text, View } from "react-native";

/**
 * ${comp} screen${doc}
 */
export default function ${comp}Screen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>${comp}</Text>
      <Text style={styles.body}>Edit this screen to build out your idea.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
  },
  body: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: "center",
  },
});
`;
}

/** Map a route name to a filename for Expo Router. */
export function screenFileName(name: string): string {
  const clean = name.trim().replace(/^\/+|\/+$/g, "");
  if (!clean) return "index.tsx";
  return clean.endsWith(".tsx") ? clean : `${clean}.tsx`;
}
