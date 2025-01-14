import {
  Alert,
  Button,
  Icon,
  InputGroup,
  Intent,
  Label,
  ProgressBar,
  Spinner,
  Switch,
  Tooltip,
} from "@blueprintjs/core";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  getTreeByBlockUid,
  getTreeByPageName,
  createBlock,
  TextNode,
} from "roam-client";
import { setInputSetting } from "../entry-helpers";
import MenuItemSelect from "./MenuItemSelect";
import {
  getField,
  HIGHLIGHT,
  isFieldInTree,
  isFieldSet,
  MainStage,
  NextButton,
  ServiceDashboard,
  StageContent,
  TOKEN_STAGE,
  useAuthenticatedAxiosGet,
  useAuthenticatedAxiosPost,
  useNextStage,
  usePageUid,
} from "./ServiceCommonComponents";

const RequestUserContent: StageContent = ({ openPanel }) => {
  const nextStage = useNextStage(openPanel);
  const pageUid = usePageUid();
  const [ready, setReady] = useState(isFieldSet("share"));
  const [deploySwitch, setDeploySwitch] = useState(true);
  const onSwitchChange = useCallback(
    (e: React.FormEvent<HTMLInputElement>) =>
      setDeploySwitch((e.target as HTMLInputElement).checked),
    [setDeploySwitch]
  );
  const shareListener = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "DIV" &&
        target.parentElement.className.includes("bp3-menu-item") &&
        target.innerText.toUpperCase() === "SHARE"
      ) {
        const shareItem = target.parentElement as HTMLAnchorElement;
        shareItem.style.border = "unset";
        setReady(true);
        setTimeout(() => {
          const grid = document.getElementsByClassName("sharing-grid")[0];
          const textarea = Array.from(
            grid.getElementsByTagName("textarea")
          ).find((t) =>
            t.parentElement.previousElementSibling.innerHTML.startsWith(
              "Readers"
            )
          );
          if (textarea) {
            textarea.parentElement.parentElement.style.border = HIGHLIGHT;
            const guide = document.createElement("span");
            guide.style.fontSize = "8px";
            guide.innerText = "(Press Enter after adding support@roamjs.com)";
            textarea.parentElement.appendChild(guide);
          }
        }, 500);
      }
    },
    [setReady]
  );
  useEffect(() => {
    if (!ready) {
      const topbar = document.getElementsByClassName("rm-topbar")[0];
      if (topbar) {
        const moreMenu = topbar.getElementsByClassName(
          "bp3-icon-more"
        )[0] as HTMLSpanElement;
        if (moreMenu) {
          moreMenu.click();
          setTimeout(() => {
            const menuItems = moreMenu.closest(
              ".bp3-popover-target.bp3-popover-open"
            )?.nextElementSibling;
            if (menuItems) {
              const shareItem = Array.from(
                menuItems.getElementsByClassName("bp3-menu-item")
              )
                .map((e) => e as HTMLAnchorElement)
                .find((e) => e.innerText === "Share");
              if (shareItem) {
                shareItem.style.border = HIGHLIGHT;
              }
            }
          }, 500);
        }
      }
      document.addEventListener("click", shareListener);
      return () => document.removeEventListener("click", shareListener);
    }
  }, [ready, shareListener]);
  const onSubmit = useCallback(() => {
    setInputSetting({
      blockUid: pageUid,
      key: "Share",
      value: `${deploySwitch}`,
    });
    nextStage();
  }, [nextStage, pageUid, deploySwitch, ready]);
  return (
    <>
      <p>
        Share your graph with <code>support@roamjs.com</code> as a <b>Reader</b>
        .
      </p>
      <Switch
        checked={deploySwitch}
        onChange={onSwitchChange}
        labelElement={"Daily Deploys"}
      />
      <p style={{ fontSize: "8px", margin: "16px 0" }}>
        Why do we need this?{" "}
        <Tooltip
          content={
            <span style={{ maxWidth: 400, display: "inline-block" }}>
              RoamJS needs to access your Roam data for automatic daily updates.
              Instead of trusting RoamJS with your password, we are asking for
              read only permission. We will only access data based on your soon
              to be configured filters for the purposes of deploying your site.
            </span>
          }
        >
          <Icon icon={"info-sign"} iconSize={8} intent={Intent.PRIMARY} />
        </Tooltip>
      </p>
      <NextButton onClick={onSubmit} disabled={!ready && deploySwitch} />
    </>
  );
};

const RequestDomainContent: StageContent = ({ openPanel }) => {
  const nextStage = useNextStage(openPanel);
  const pageUid = usePageUid();
  const [value, setValue] = useState(getField("domain"));
  const [error, setError] = useState("");
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
    [setValue]
  );
  const onBlur = useCallback(() => {
    if (!/\.[a-z]{2,8}$/.test(value)) {
      return setError("Invalid domain. Try a .com!");
    }
    return setError("");
  }, [value]);
  const onSubmit = useCallback(() => {
    setInputSetting({ blockUid: pageUid, key: "domain", value, index: 1 });
    nextStage();
  }, [value, nextStage, pageUid]);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !e.altKey &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        onSubmit();
      }
    },
    [onSubmit]
  );
  return (
    <>
      <Label>
        Custom Domain
        <InputGroup
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
        <span style={{ color: "darkred" }}>{error}</span>
      </Label>
      <NextButton onClick={onSubmit} disabled={!!error || !value} />
    </>
  );
};

const RequestIndexContent: StageContent = ({ openPanel }) => {
  const nextStage = useNextStage(openPanel);
  const pageUid = usePageUid();
  const [value, setValue] = useState(getField("index"));
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
    [setValue]
  );
  const onSubmit = useCallback(() => {
    setInputSetting({ blockUid: pageUid, key: "index", value, index: 1 });
    nextStage();
  }, [value, nextStage]);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !e.altKey &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        onSubmit();
      }
    },
    [onSubmit]
  );
  return (
    <>
      <Label>
        Website Index
        <InputGroup value={value} onChange={onChange} onKeyDown={onKeyDown} />
      </Label>
      <NextButton onClick={onSubmit} disabled={!value} />
    </>
  );
};

const RequestFiltersContent: StageContent = ({ openPanel }) => {
  const nextStage = useNextStage(openPanel);
  const pageUid = usePageUid();
  const [filters, setFilters] = useState<(TextNode & { key: number })[]>(
    (
      getTreeByPageName("roam/js/static-site").find((t) =>
        /filter/i.test(t.text)
      ).children || []
    ).map((t, key) => ({ ...t, key }))
  );
  const [key, setKey] = useState(filters.length);
  const onSubmit = useCallback(() => {
    const tree = getTreeByBlockUid(pageUid);
    const keyNode = tree.children.find((t) => /filter/i.test(t.text));
    if (keyNode) {
      keyNode.children.forEach(({ uid }) =>
        window.roamAlphaAPI.deleteBlock({ block: { uid } })
      );
      filters.forEach((node, order) =>
        createBlock({ node, order, parentUid: pageUid })
      );
    } else if (!keyNode) {
      createBlock({
        node: { text: "Filter", children: filters },
        order: 2,
        parentUid: pageUid,
      });
    }
    nextStage();
  }, [filters, nextStage]);
  const onAddFilter = useCallback(() => {
    setFilters([
      ...filters,
      {
        text: "TAGGED WITH",
        children: [{ text: "Website", children: [] }],
        key,
      },
    ]);
    setKey(key + 1);
  }, [filters, setFilters, key, setKey]);
  return (
    <>
      <div style={{ margin: "16px 0" }}>
        {filters.map((f) => (
          <div
            key={f.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingRight: "25%",
              marginBottom: 16,
            }}
          >
            <MenuItemSelect
              items={["STARTS WITH", "TAGGED WITH"]}
              onItemSelect={(s) =>
                setFilters(
                  filters.map((filter) =>
                    f.key === filter.key ? { ...filter, text: s } : filter
                  )
                )
              }
              activeItem={f.text}
            />
            <InputGroup
              value={f.children[0].text}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFilters(
                  filters.map((filter) =>
                    f.key === filter.key
                      ? {
                          ...filter,
                          children: [{ text: e.target.value, children: [] }],
                        }
                      : filter
                  )
                )
              }
            />
            <Button
              icon={"trash"}
              minimal
              onClick={() =>
                setFilters(filters.filter((filter) => filter.key !== f.key))
              }
            />
          </div>
        ))}
        <Button onClick={onAddFilter}>ADD FILTER</Button>
      </div>
      <div>
        <NextButton onClick={onSubmit} />
      </div>
    </>
  );
};

const getLaunchBody = () => {
  const tree = getTreeByPageName("roam/js/static-site");
  return {
    graph: new RegExp(`^#/app/(.*?)/page/`).exec(window.location.hash)[1],
    domain: tree.find((t) => /domain/i.test(t.text))?.children?.[0]?.text,
    autoDeploysEnabled: true /*/true/i.test(
      tree.find((t) => /share/i.test(t.text))?.children?.[0]?.text
    ),*/,
  };
};

const getNameServers = (statusProps: string): string[] => {
  try {
    const { nameServers } = JSON.parse(statusProps);
    return nameServers || [];
  } catch {
    return [];
  }
};

const isWebsiteReady = (w: { status: string; deploys: { status: string }[] }) =>
  w.status === "LIVE" &&
  w.deploys.length &&
  ["SUCCESS", "FAILURE"].includes(w.deploys[0].status);

const getStatusColor = (status: string) =>
  ["LIVE", "SUCCESS"].includes(status)
    ? "darkgreen"
    : status === "FAILURE"
    ? "darkred"
    : "goldenrod";

const LiveContent: StageContent = () => {
  const authenticatedAxiosGet = useAuthenticatedAxiosGet();
  const authenticatedAxiosPost = useAuthenticatedAxiosPost();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isShutdownOpen, setIsShutdownOpen] = useState(false);
  const [statusProps, setStatusProps] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [deploys, setDeploys] = useState<
    { status: string; date: string; uuid: string }[]
  >([]);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const timeoutRef = useRef(0);

  const openShutdown = useCallback(() => setIsShutdownOpen(true), [
    setIsShutdownOpen,
  ]);
  const closeShutdown = useCallback(() => setIsShutdownOpen(false), [
    setIsShutdownOpen,
  ]);
  const getWebsite = useCallback(
    () =>
      authenticatedAxiosGet("website-status").then((r) => {
        if (r.data) {
          setStatusProps(r.data.statusProps);
          setStatus(r.data.status);
          setDeploys(r.data.deploys);
          setProgress(r.data.progress);
          if (!isWebsiteReady(r.data)) {
            setShowProgress(true);
            timeoutRef.current = window.setTimeout(getWebsite, 5000);
          } else {
            setShowProgress(false);
          }
        } else {
          setStatusProps("{}");
          setStatus("");
          setDeploys([]);
          setProgress(0);
          setShowProgress(false);
        }
      }),
    [
      setStatus,
      setDeploys,
      timeoutRef,
      setStatusProps,
      setShowProgress,
      setProgress,
    ]
  );
  const wrapPost = useCallback(
    (path: string, data?: Record<string, unknown>) => () => {
      setError("");
      setLoading(true);
      authenticatedAxiosPost(path, data)
        .then(getWebsite)
        .catch((e) => setError(e.response?.data || e.message))
        .finally(() => setLoading(false));
    },
    [setError, setLoading, getWebsite, authenticatedAxiosPost]
  );
  const launchWebsite = useCallback(
    wrapPost("launch-website", getLaunchBody()),
    [wrapPost]
  );
  const manualDeploy = useCallback(wrapPost("deploy"), [wrapPost]);
  const shutdownWebsite = useCallback(
    wrapPost("shutdown-website", {
      graph: new RegExp(`^#/app/(.*?)/page/`).exec(window.location.hash)[1],
    }),
    [wrapPost]
  );

  useEffect(() => () => clearTimeout(timeoutRef.current), [timeoutRef]);
  const siteDeploying = loading || !isWebsiteReady({ status, deploys });
  useEffect(() => {
    setLoading(true);
    getWebsite()
      .then(() => setInitialLoad(false))
      .catch((e) => setError(e.response?.data || e.message))
      .finally(() => setLoading(false));
  }, [setError, setLoading, setInitialLoad, getWebsite]);
  return (
    <>
      {loading && <Spinner />}
      {error && <div style={{ color: "darkred" }}>{error}</div>}
      {!initialLoad && (
        <>
          {status ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <span>Status</span>
                {status === "AWAITING VALIDATION" ? (
                  <div style={{ color: "darkblue" }}>
                    <span>{status}</span>
                    <br />
                    To continue, add the following Name Servers to your Domain
                    Management Settings:
                    <ul>
                      {getNameServers(statusProps).map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <span
                    style={{ marginLeft: 16, color: getStatusColor(status) }}
                  >
                    {status}
                  </span>
                )}
              </div>
              {showProgress && (
                <div style={{ margin: "8px 0" }}>
                  <ProgressBar value={progress} intent={Intent.PRIMARY} />
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <Button
                  style={{ marginRight: 32 }}
                  disabled={siteDeploying}
                  onClick={manualDeploy}
                  intent={Intent.PRIMARY}
                >
                  Manual Deploy
                </Button>
                <Button
                  onClick={openShutdown}
                  disabled={siteDeploying}
                  intent={Intent.DANGER}
                >
                  Shutdown
                </Button>
              </div>
              <Alert
                isOpen={isShutdownOpen}
                onConfirm={shutdownWebsite}
                onClose={closeShutdown}
                canOutsideClickCancel
                canEscapeKeyCancel
                cancelButtonText={"Cancel"}
              >
                <p>
                  Are you sure you want to shut down this RoamJS website? This
                  operation is irreversible.
                </p>
              </Alert>
              <hr style={{ margin: "16px 0" }} />
              <h6>Deploys</h6>
              <ul>
                {deploys.map((d) => (
                  <div key={d.uuid}>
                    <span style={{ display: "inline-block", minWidth: "30%" }}>
                      At {new Date(d.date).toLocaleString()}
                    </span>
                    <span
                      style={{
                        marginLeft: 16,
                        color: getStatusColor(d.status),
                      }}
                    >
                      {d.status}
                    </span>
                  </div>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p>
                You're ready to launch your new site! Click the button below to
                start.
              </p>
              <Button
                disabled={loading}
                onClick={launchWebsite}
                intent={Intent.PRIMARY}
                style={{ maxWidth: 240 }}
              >
                LAUNCH
              </Button>
            </>
          )}
        </>
      )}
    </>
  );
};

const StaticSiteDashboard = (): React.ReactElement => (
  <ServiceDashboard
    service={"static-site"}
    stages={[
      TOKEN_STAGE,
      {
        check: isFieldInTree("share"),
        component: RequestUserContent,
        setting: "Share",
      },
      {
        check: isFieldInTree("domain"),
        component: RequestDomainContent,
        setting: "Domain",
      },
      {
        check: isFieldInTree("index"),
        component: RequestIndexContent,
        setting: "Index",
      },
      {
        check: isFieldInTree("filter"),
        component: RequestFiltersContent,
        setting: "Filters",
      },
      MainStage(LiveContent),
    ]}
  />
);

export default StaticSiteDashboard;
