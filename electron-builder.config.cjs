module.exports = {
  appId: "com.brewbudget.desktop",
  productName: "BrewBudget",
  electronVersion: "45.5.0",
  directories: {
    output: "../dist",
  },
  files: [
    "main.cjs",
    "package.json",
  ],
  mac: {
    target: [
      {
        target: "dmg",
        arch: ["universal"],
      },
    ],
    category: "public.app-category.finance",
    artifactName: "BrewBudget-${version}-mac-${arch}.${ext}",
  },
  dmg: {
    title: "BrewBudget",
    contents: [
      { x: 130, y: 180, type: "file" },
      { x: 410, y: 180, type: "link", path: "/Applications" },
    ],
  },
};
