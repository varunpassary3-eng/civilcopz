const NationalAdapter = require('./nationalAdapter');

/**
 * DelhiAdapter: Delhi State Consumer Dispute Redressal Commission (DCCRC)
 * Inherits from the National AFE V3 standard with regional overrides.
 */
class DelhiAdapter extends NationalAdapter.constructor {
  constructor() {
    super();
    this.stateCode = 'DL';
  }

  // Delhi Commission currently follows the National Standard (AFE V3)
  // We mirror the NationalAdapter but maintain separate identity for future bifurcations.
}

module.exports = new DelhiAdapter();
