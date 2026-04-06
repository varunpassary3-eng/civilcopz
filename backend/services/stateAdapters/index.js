const NationalAdapter = require('./nationalAdapter');
const DelhiAdapter = require('./delhiAdapter');
const MaharashtraAdapter = require('./maharashtraAdapter');

/**
 * StateAdapterFactory: G2G Schema Dispatcher
 * Dynamically selects the appropriate registry adapter based on jurisdiction.
 */
class StateAdapterFactory {
  getAdapter(forum) {
    const forumUpper = forum.toUpperCase();
    console.info(`[REGISTRY_FACTORY] Selecting production adapter for Forum: ${forumUpper}`);

    // Delhi State Commission (DCCRC)
    if (forumUpper.includes('DELHI')) {
      return DelhiAdapter;
    }

    // Maharashtra State Commission (MSCDRC)
    if (forumUpper.includes('MAHARASHTRA') || forumUpper.includes('MSCDRC')) {
      return MaharashtraAdapter;
    }

    // National & Default Standard: AFE V3.0
    return NationalAdapter;
  }
}

module.exports = new StateAdapterFactory();
