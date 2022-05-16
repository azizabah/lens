/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import syncBoxChannelInjectable from "./sync-box-channel.injectable";
import { channelListenerInjectionToken } from "../channel/channel-listener-injection-token";
import syncBoxStateInjectable from "./sync-box-state.injectable";

const syncBoxChannelListenerInjectable = getInjectable({
  id: "sync-box-channel-listener",

  instantiate: (di) => {
    const getSyncBoxState = (id: string) => di.inject(syncBoxStateInjectable, id);

    return {
      channel: di.inject(syncBoxChannelInjectable),

      handler: ({ id, value }) => {
        const target = getSyncBoxState(id);

        if (target) {
          target.set(value);
        }
      },
    };
  },

  injectionToken: channelListenerInjectionToken,
});

export default syncBoxChannelListenerInjectable;
