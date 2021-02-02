//
// Preferences management that uses a Lens Store for persistence
//

import { observable, toJS } from 'mobx';
import { Store } from '@k8slens/extensions';
import * as rtv from 'rtvjs';
import { logger } from '../../util';
import pkg from '../../../package.json';

/** RTV.js typeset for preferences model. */
export const preferencesTs = {
  /** MCC instance URL, does NOT end with a slash. */
  cloudUrl: [
    rtv.EXPECTED,
    rtv.STRING,
    (v) => {
      if (v && v.match(/\/$/)) {
        throw new Error('cloudUrl must not end with a slash');
      }
    },
  ],

  /** Username used for authentication purposes to the MCC instance. */
  username: [rtv.EXPECTED, rtv.STRING],

  /** Absolute path where kubeconfigs are to be saved. */
  savePath: [rtv.EXPECTED, rtv.STRING],

  /**
   * If true, the refresh token generated for the clusters will be enabled for
   *  offline access. WARNING: This is less secure than a normal refresh token as
   *  it will never expire.
   */
  offline: [rtv.EXPECTED, rtv.BOOLEAN],

  /**
   * If true, the clusters will be added to new (or existing if the workspaces already
   *  exist) workspaces that correlate to their original MCC namespaces; otherwise,
   *  they will all be added to the active workspace.
   */
  addToNew: [rtv.EXPECTED, rtv.BOOLEAN],
};

/** Preferences auto-persisted by Lens. Singleton. Use `getInstance()` static method. */
export class PreferencesStore extends Store.ExtensionStore {
  // NOTE: See renderer.tsx#onActivate() where this.loadExtension() is called on
  //  the store instance in order to get Lens to load it from storage.

  // ultimately, we try to set this to the getExtensionFileFolder() directory that
  //  Lens gives the extension, but we don't know what it is until later
  static defaultSavePath = null;

  static getDefaults() {
    return {
      cloudUrl: null,
      username: null,
      savePath: PreferencesStore.defaultSavePath,
      offline: false,
      addToNew: true,
    };
  }

  /**
   * List of onUpdate handlers to be called whenever this store gets updated from disk.
   * @type {Array<Function>}
   */
  updateHandlers = [];

  /**
   * [Stored]
   * @property {string|null} cloudUrl URL to the MCC instance.
   */
  @observable cloudUrl;

  /**
   * [Stored]
   * @property {string|null} username Username used to log into the MCC instance.
   */
  @observable username;

  /**
   * [Stored]
   * @property {string|null} savePath Absolute path on the local disk where kubeConfig
   *  files should be saved.
   */
  @observable savePath;

  /**
   * [Stored]
   * @property {boolean} offline True if kubeConfigs generated by this extension should
   *  use offline tokens; false if not.
   */
  @observable offline;

  /**
   * [Stored]
   * @property {boolean} addToNew True if MCC clusters added by this extension to Lens
   *  should be added into new/existing workspaces with names similar to their original
   *  MCC namespaces/projects; false if they should always be added to the active
   *  Lens workspace.
   */
  @observable addToNew;

  constructor() {
    super({
      configName: 'preferences-store',
      defaults: PreferencesStore.getDefaults(),
    });
  }

  /** Reset all preferences to their default values. */
  reset() {
    const defaults = PreferencesStore.getDefaults();
    Object.keys(this).forEach((key) => (this[key] = defaults[key]));
  }

  fromStore(store) {
    const result = rtv.check({ store }, { store: preferencesTs });

    if (!result.valid) {
      logger.error(
        'PreferencesStore.fromStore()',
        `Invalid preferences found, error="${result.message}"`
      );
      return;
    }

    Object.keys(store).forEach((key) => (this[key] = store[key]));

    // call any onUpdate() handlers
    this.updateHandlers.forEach((h) => h());
  }

  toJSON() {
    // throw-away: just to get keys we care about on this
    const defaults = PreferencesStore.getDefaults();

    const observableThis = Object.keys(defaults).reduce((obj, key) => {
      obj[key] = this[key];
      return obj;
    }, {});

    // return a deep-clone that is no longer observable
    return toJS(observableThis, { recurseEverything: true });
  }

  /**
   * Adds an onUpdate() handler if it hasn't already been added. This handler
   *  will be called whenever this store is updated from disk.
   * @param {Function} handler
   */
  addUpdateHandler(handler) {
    if (!this.updateHandlers.find((h) => h === handler)) {
      this.updateHandlers.push(handler);
    }
  }

  /**
   * Removes an onUpdate() handler if it's currently in the list.
   * @param {Function} handler
   */
  removeUpdateHandler(handler) {
    const idx = this.updateHandlers.findIndex((h) => h === handler);
    if (idx >= 0) {
      this.updateHandlers.splice(idx, 1);
    }
  }
}

// singleton instance, for convenience
export const prefStore = PreferencesStore.getInstance();
