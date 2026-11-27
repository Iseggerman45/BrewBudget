exports.default = async function onNodeModuleFile() {
  // BrewBudget Desktop is a secure web wrapper. The actual app runs on
  // brewbudget.vercel.app, so no root web-app node_modules are needed inside
  // the Electron bundle. Electron itself is supplied by the packaged runtime.
  return false;
};
