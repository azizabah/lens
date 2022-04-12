/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

import electronAppInjectable from "../electron-app/electron-app.injectable";
import { beforeApplicationIsReadyInjectionToken } from "./before-application-is-ready/before-application-is-ready-injection-token";
import { afterApplicationIsReadyInjectionToken } from "./after-application-is-ready/after-application-is-ready-injection-token";
import { runManyFor } from "./run-many-for";

const startMainApplicationInjectable = getInjectable({
  id: "start-main-application",

  instantiate: (di) => {
    const runMany = runManyFor(di);
    const app = di.inject(electronAppInjectable);

    return async () => {
      await runMany(beforeApplicationIsReadyInjectionToken)();

      await app.whenReady();

      await runMany(afterApplicationIsReadyInjectionToken)();
    };
  },
});

export default startMainApplicationInjectable;



