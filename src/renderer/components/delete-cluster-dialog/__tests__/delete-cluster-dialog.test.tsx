/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import "@testing-library/jest-dom/extend-expect";
import { KubeConfig } from "@kubernetes/client-node";
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import mockFs from "mock-fs";
import React from "react";
import * as selectEvent from "react-select-event";
import type { Cluster } from "../../../../common/cluster/cluster";
import { DeleteClusterDialog } from "../delete-cluster-dialog";
import type { ClusterModel } from "../../../../common/cluster-types";
import { createClusterInjectionToken } from "../../../../common/cluster/create-cluster-injection-token";
import createContextHandlerInjectable from "../../../../main/context-handler/create-context-handler.injectable";
import deleteClusterDialogModelInjectable from "../delete-cluster-dialog-model/delete-cluster-dialog-model.injectable";
import type { DeleteClusterDialogModel } from "../delete-cluster-dialog-model/delete-cluster-dialog-model";
import hotbarStoreInjectable from "../../../../common/hotbar-store.injectable";
import type { ApplicationBuilder } from "../../test-utils/get-application-builder";
import { getApplicationBuilder } from "../../test-utils/get-application-builder";
import { routeInjectionToken } from "../../../../common/front-end-routing/route-injection-token";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { routeSpecificComponentInjectionToken } from "../../../routes/route-specific-component-injection-token";
import { navigateToRouteInjectionToken } from "../../../../common/front-end-routing/navigate-to-route-injection-token";

jest.mock("electron", () => ({
  app: {
    getVersion: () => "99.99.99",
    getName: () => "lens",
    setName: jest.fn(),
    setPath: jest.fn(),
    getPath: () => "tmp",
    getLocale: () => "en",
    setLoginItemSettings: jest.fn(),
  },
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
  },
}));

const kubeconfig = `
apiVersion: v1
clusters:
- cluster:
    server: https://localhost
  name: test
- cluster:
    server: http://localhost
  name: other-cluster
contexts:
- context:
    cluster: test
    user: test
  name: test
- context:
    cluster: test
    user: test
  name: test2
- context:
    cluster: other-cluster
    user: test
  name: other-context
current-context: other-context
kind: Config
preferences: {}
users:
- name: test
  user:
    token: kubeconfig-user-q4lm4:xxxyyyy
`;

const singleClusterConfig = `
apiVersion: v1
clusters:
- cluster:
    server: http://localhost
  name: other-cluster
contexts:
- context:
    cluster: other-cluster
    user: test
  name: other-context
current-context: other-context
kind: Config
preferences: {}
users:
- name: test
  user:
    token: kubeconfig-user-q4lm4:xxxyyyy
`;

let config: KubeConfig;

describe("<DeleteClusterDialog />", () => {
  let applicationBuilder: ApplicationBuilder;

  beforeEach(async () => {
    applicationBuilder = getApplicationBuilder();

    mockFs();

    applicationBuilder.beforeSetups(({ mainDi, rendererDi }) => {
      mainDi.override(createContextHandlerInjectable, () => () => undefined);

      rendererDi.override(hotbarStoreInjectable, () => ({}));

      const testRouteInjectable = getInjectable({
        id: "some-test-route",

        instantiate: () => ({
          path: "/some-test-path",
          clusterFrame: false,
          isEnabled: computed(() => true),
        }),

        injectionToken: routeInjectionToken,
      });

      const testRouteComponent = getInjectable({
        id: "some-test-component",

        instantiate: (di) => ({
          route: di.inject(testRouteInjectable),
          Component: () => <DeleteClusterDialog />,
        }),

        injectionToken: routeSpecificComponentInjectionToken,
      });

      applicationBuilder.beforeRender(({ rendererDi }) => {
        const navigateToRoute = rendererDi.inject(navigateToRouteInjectionToken);
        const testRoute = rendererDi.inject(testRouteInjectable);

        navigateToRoute(testRoute);
      });

      rendererDi.register(testRouteInjectable, testRouteComponent);
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe("Kubeconfig with different clusters", () => {
    let rendered: RenderResult;
    let createCluster: (model: ClusterModel) => Cluster;
    let deleteClusterDialogModel: DeleteClusterDialogModel;

    beforeEach(async () => {
      const mockOpts = {
        "temp-kube-config": kubeconfig,
      };

      mockFs(mockOpts);

      config = new KubeConfig();
      config.loadFromString(kubeconfig);

      rendered = await applicationBuilder.render();

      deleteClusterDialogModel = applicationBuilder.dis.rendererDi.inject(deleteClusterDialogModelInjectable);
      createCluster = applicationBuilder.dis.mainDi.inject(createClusterInjectionToken);
    });

    afterEach(() => {
      mockFs.restore();
    });

    it("renders w/o errors", () => {
      expect(rendered.container).toBeInstanceOf(HTMLElement);
    });

    it("shows warning when deleting non-current-context cluster", () => {
      const cluster = createCluster({
        id: "test",
        contextName: "test",
        preferences: {
          clusterName: "minikube",
        },
        kubeConfigPath: "./temp-kube-config",
      });

      deleteClusterDialogModel.open({ cluster, config });

      const message = "The contents of kubeconfig file will be changed!";

      expect(rendered.getByText(message)).toBeInstanceOf(HTMLElement);
    });

    it("shows warning when deleting current-context cluster", () => {
      const cluster = createCluster({
        id: "other-cluster",
        contextName: "other-context",
        preferences: {
          clusterName: "other-cluster",
        },
        kubeConfigPath: "./temp-kube-config",
      });

      deleteClusterDialogModel.open({ cluster, config });

      expect(rendered.getByTestId("current-context-warning")).toBeInstanceOf(HTMLElement);
    });

    it("shows context switcher when deleting current cluster", async () => {
      const cluster = createCluster({
        id: "other-cluster",
        contextName: "other-context",
        preferences: {
          clusterName: "other-cluster",
        },
        kubeConfigPath: "./temp-kube-config",
      });

      deleteClusterDialogModel.open({ cluster, config });

      const { getByText } = rendered;

      expect(getByText("Select...")).toBeInTheDocument();
      selectEvent.openMenu(getByText("Select..."));

      expect(getByText("test")).toBeInTheDocument();
      expect(getByText("test2")).toBeInTheDocument();
    });

    it("shows context switcher after checkbox click", async () => {
      const cluster = createCluster({
        id: "some-cluster",
        contextName: "test",
        preferences: {
          clusterName: "test",
        },
        kubeConfigPath: "./temp-kube-config",
      });

      deleteClusterDialogModel.open({ cluster, config });

      const { getByText, getByTestId } = rendered;
      const link = getByTestId("context-switch");

      expect(link).toBeInstanceOf(HTMLElement);
      fireEvent.click(link);

      expect(getByText("Select...")).toBeInTheDocument();
      selectEvent.openMenu(getByText("Select..."));

      expect(getByText("test")).toBeInTheDocument();
      expect(getByText("test2")).toBeInTheDocument();
    });

    it("shows warning for internal kubeconfig cluster", () => {
      const cluster = createCluster({
        id: "some-cluster",
        contextName: "test",
        preferences: {
          clusterName: "test",
        },
        kubeConfigPath: "./temp-kube-config",
      });

      const spy = jest.spyOn(cluster, "isInLocalKubeconfig").mockImplementation(() => true);

      deleteClusterDialogModel.open({ cluster, config });

      expect(rendered.getByTestId("internal-kubeconfig-warning")).toBeInstanceOf(HTMLElement);

      spy.mockRestore();
    });
  });

  describe("Kubeconfig with single cluster", () => {
    let rendered: RenderResult;
    let createCluster: (model: ClusterModel) => Cluster;
    let deleteClusterDialogModel: DeleteClusterDialogModel;

    beforeEach(async () => {
      const mockOpts = {
        "temp-kube-config": singleClusterConfig,
      };

      mockFs(mockOpts);

      config = new KubeConfig();
      config.loadFromString(singleClusterConfig);

      rendered = await applicationBuilder.render();

      deleteClusterDialogModel = applicationBuilder.dis.rendererDi.inject(deleteClusterDialogModelInjectable);
      createCluster = applicationBuilder.dis.mainDi.inject(createClusterInjectionToken);
    });

    afterEach(() => {
      mockFs.restore();
    });

    it("shows warning if no other contexts left", () => {
      const cluster = createCluster({
        id: "other-cluster",
        contextName: "other-context",
        preferences: {
          clusterName: "other-cluster",
        },
        kubeConfigPath: "./temp-kube-config",
      });

      deleteClusterDialogModel.open({ cluster, config });

      expect(rendered.getByTestId("no-more-contexts-warning")).toBeInstanceOf(HTMLElement);
    });
  });
});
