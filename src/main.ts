import { LensMainExtension } from '@k8slens/extensions';
import { mainRoute } from './routes';
import { prefStore } from './cc/store/PreferencesStore';
import { source } from './cc/store/CatalogSource';
import { logger } from './util';
import * as strings from './strings';
import pkg from '../package.json';

// NOTE: This code runs in a separate process from the one that the renderer.tsx
//  code runs in, so you won't be able to debug this code in DevTools, and you
//  won't see any console statements in the DevTools console. To see console
//  statements, start the Lens app from a Terminal with the following
//  command: `DEBUG=true /Applications/Lens.app/Contents/MacOS/Lens`
// Once started, you'll see console statements appear __in the Terminal__.
// For instance, you may want to hook into onActivate() or onDeactivate().

export default class ExtensionMain extends LensMainExtension {
  appMenus = [
    {
      parentId: 'file',
      label: strings.extension.appMenu['label'](),
      click: () => {
        this.navigate(mainRoute);
      },
    },
  ];

  async onActivate() {
    logger.log('main', 'extension activated');

    // DEBUG TODO: this is pointless because we'd also need to add clusters
    //  in this main process, and EVERYTHING related to clusters in this
    //  extension needs to happen in the RENDERER process...
    this.addCatalogSource(pkg.name, source);

    await prefStore.loadExtension(this);
  }

  onDeactivate() {
    logger.log('main', 'extension deactivated');
  }
}
