module.exports = {
  appId: "com.brewbudget.desktop",
  productName: "BrewBudget",
  directories: {
    output: "dist",
  },
  files: [
    "electron/**/*",
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
    // The desktop shell loads the hosted web app and does not require any
    // Node packages at runtime. Exclude the web application's dependencies.
    singleArchFiles: "**/*.node",
  },
  dmg: {
    title: "BrewBudget",
    contents: [
      { x: 130, y: 180, type: "file" },
      { x: 410, y: 180, type: "link", path: "/Applications" },
    ],
  },
  onNodeModuleFile: () => false,
};
