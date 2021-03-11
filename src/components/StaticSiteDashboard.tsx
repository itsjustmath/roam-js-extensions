import {
  Alert,
  Button,
  Card,
  Icon,
  InputGroup,
  Intent,
  Label,
  Spinner,
  Tooltip,
} from "@blueprintjs/core";
import axios, { AxiosResponse } from "axios";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import {
  getTreeByBlockUid,
  getTreeByPageName,
  createBlock,
  TextNode,
  getSettingsByEmail,
} from "roam-client";
import { getPageUidByPageTitle, setInputSetting } from "../entry-helpers";

const useAuthenticatedAxiosGet = (): ((
  path: string
) => Promise<AxiosResponse>) =>
  useCallback(
    (path: string) =>
      axios.get(`${process.env.REST_API_URL}/${path}`, {
        headers: { Authorization: `staticSite:${getToken()}` },
      }),
    []
  );

const useAuthenticatedAxiosPost = (): ((
  path: string,
  data?: Record<string, unknown>
) => Promise<AxiosResponse>) =>
  useCallback(
    (path: string, data?: Record<string, unknown>) =>
      axios.post(`${process.env.REST_API_URL}/${path}`, data || {}, {
        headers: { Authorization: `staticSite:${getToken()}` },
      }),
    []
  );

const getToken = () =>
  getTreeByPageName("roam/js/static-site").find((t) => /token/i.test(t.text))
    ?.children?.[0]?.text;

type StageValue =
  | "RequestToken"
  | "RequestUser"
  | "RequestDomain"
  | "RequestIndex"
  | "RequestFilters"
  | "Live";

const getStage = (): StageValue => {
  const tree = getTreeByPageName("roam/js/static-site");
  if (!tree.find((t) => /token/i.test(t.text))?.children?.[0]?.text) {
    return "RequestToken";
  } else if (!getSettingsByEmail("support@roamjs.com")) {
    return "RequestUser";
  } else if (!tree.some((t) => /domain/i.test(t.text))) {
    return "RequestDomain";
  } else if (!tree.some((t) => /index/i.test(t.text))) {
    return "RequestIndex";
  } else if (!tree.some((t) => /filter/i.test(t.text))) {
    return "RequestFilters";
  } else {
    return "Live";
  }
};

type StageContent = (props: {
  pageUid: string;
  setStage: (v: StageValue) => void;
  graph: string;
}) => React.ReactElement;

const RequestTokenContent: StageContent = ({ pageUid, setStage }) => {
  const [value, setValue] = useState("");
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
    [setValue]
  );
  const onSubmit = useCallback(() => {
    setInputSetting({ blockUid: pageUid, key: "token", value });
    setStage("RequestUser");
  }, [value, setStage, pageUid]);
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
      <p>Paste in your token from RoamJS below</p>
      <Label>
        RoamJS Static Site Token
        <InputGroup value={value} onChange={onChange} onKeyDown={onKeyDown} />
      </Label>
      <Button onClick={onSubmit} intent={Intent.PRIMARY}>
        NEXT
      </Button>
    </>
  );
};

const HIGHLIGHT = "border: 3px dashed yellowgreen";

const RequestUserContent: StageContent = ({ setStage }) => {
  const [ready, setReady] = useState(false);
  const timeoutRef = useRef(0);
  const checkSettings = useCallback(() => {
    if (!ready) {
      const settings = getSettingsByEmail("support@roamjs.com");
      if (!settings) {
        timeoutRef.current = window.setTimeout(checkSettings, 3000);
      } else {
        setReady(true);
      }
    }
  }, [timeoutRef, setReady, ready]);
  useEffect(() => {
    const topbar = document.getElementsByClassName("rm-topbar")[0];
    if (topbar) {
      const moreMenu = topbar.getElementsByClassName(
        "bp3-icon-more"
      )[0] as HTMLSpanElement;
      if (moreMenu) {
        moreMenu.style.border = HIGHLIGHT;
        const listener = () => {
          moreMenu.style.border = "unset";
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
                const shareListener = () => {
                  shareItem.style.border = "unset";
                  setTimeout(() => {
                    const grid = document.getElementsByClassName(
                      "sharing-grid"
                    )[0];
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
                      guide.innerText =
                        "(Press Enter after adding support@roamjs.com)";
                      textarea.parentElement.appendChild(guide);
                    }
                  }, 500);
                  shareItem.removeEventListener("click", shareListener);
                };
                shareItem.addEventListener("click", shareListener);
              }
            }
          }, 500);
          moreMenu.removeEventListener("click", listener);
        };
        moreMenu.addEventListener("click", listener);
      }
    }
    checkSettings();
    return () => window.clearTimeout(timeoutRef.current);
  }, [checkSettings]);
  const onSubmit = useCallback(() => setStage("RequestDomain"), [setStage]);
  return (
    <>
      <p>
        Click the highlighted more menu above to share your graph with{" "}
        <code>support@roamjs.com</code> as a <b>Reader</b>.
      </p>
      <p style={{ fontSize: "8px" }}>
        Why do we need this?{" "}
        <Tooltip
          content={
            "RoamJS needs to access your Roam data for automatic daily updates. Instead of trusting RoamJS with your password, we are asking for read only permission. We will only access data based on your soon to be configured filters for the purposes of deploying your site."
          }
        >
          <Icon icon={"info-sign"} />
        </Tooltip>
      </p>
      <Button onClick={onSubmit} disabled={!ready} intent={Intent.PRIMARY}>
        NEXT
      </Button>
    </>
  );
};

const RequestDomainContent: StageContent = ({ pageUid, setStage }) => {
  const [value, setValue] = useState("");
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
    setStage("RequestIndex");
  }, [value, setStage]);
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
      <Button onClick={onSubmit} disabled={!error} intent={Intent.PRIMARY}>
        NEXT
      </Button>
    </>
  );
};

const RequestIndexContent: StageContent = ({ pageUid, setStage }) => {
  const [value, setValue] = useState("");
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
    [setValue]
  );
  const onSubmit = useCallback(() => {
    setInputSetting({ blockUid: pageUid, key: "index", value, index: 1 });
    setStage("RequestFilters");
  }, [value, setStage]);
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
      <Button onClick={onSubmit} intent={Intent.PRIMARY}>
        NEXT
      </Button>
    </>
  );
};

const RequestFiltersContent: StageContent = ({ pageUid, setStage }) => {
  const [filters, setFilters] = useState<TextNode[]>([]);
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
    setStage("Live");
  }, [filters]);
  const onAddFilter = useCallback(() => {
    setFilters([
      ...filters,
      { text: "TAGGED WITH", children: [{ text: "Website", children: [] }] },
    ]);
  }, [filters, setFilters]);
  return (
    <>
      <div>
        <Button onClick={onAddFilter}>ADD FILTER</Button>
      </div>
      <div>
        <Button onClick={onSubmit} intent={Intent.PRIMARY}>
          NEXT
        </Button>
      </div>
    </>
  );
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

const LiveContent: StageContent = ({ graph }) => {
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
          if (!isWebsiteReady(r.data)) {
            timeoutRef.current = window.setTimeout(getWebsite, 5000);
          }
        } else {
          setStatusProps("{}");
          setStatus("");
          setDeploys([]);
        }
      }),
    [setStatus, setDeploys, timeoutRef, setStatusProps]
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
    wrapPost("launch-website", {
      graph,
      domain: getTreeByPageName("roam/js/static-site").find((t) =>
        /domain/i.test(t.text)
      )?.children?.[0]?.text,
    }),
    [graph, wrapPost]
  );
  const manualDeploy = useCallback(wrapPost("deploy"), [wrapPost]);
  const shutdownWebsite = useCallback(wrapPost("shutdown-website", { graph }), [
    wrapPost,
    graph,
  ]);

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
              <div style={{ marginBottom: 16 }}>
                <span>Status</span>
                {status === "AWAITING VALIDATION" ? (
                  <div style={{ color: "darkblue" }}>
                    <span>{status}</span>
                    <br />
                    To continue, add the following Name Servers to your Domain
                    Management Settings:
                    <ul>
                      {(JSON.parse(statusProps).nameServers as string[]).map(
                        (n) => (
                          <li>{n}</li>
                        )
                      )}
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
              <Button
                style={{ marginRight: 32 }}
                disabled={siteDeploying}
                onClick={manualDeploy}
                intent={Intent.PRIMARY}
              >
                Manual Deploy
              </Button>
              <Button onClick={openShutdown} intent={Intent.DANGER}>
                Shutdown
              </Button>
              <Alert
                isOpen={isShutdownOpen}
                onConfirm={shutdownWebsite}
                onClose={closeShutdown}
                canOutsideClickCancel
                canEscapeKeyCancel
                cancelButtonText={"cancel"}
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
                    <span>At {new Date(d.date).toLocaleString()}</span>
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

const components = {
  RequestToken: RequestTokenContent,
  RequestUser: RequestUserContent,
  RequestDomain: RequestDomainContent,
  RequestIndex: RequestIndexContent,
  RequestFilters: RequestFiltersContent,
  Live: LiveContent,
};

const StaticSiteDashboard = (): React.ReactElement => {
  const pageUid = useMemo(
    () => getPageUidByPageTitle("roam/js/static-site"),
    []
  );
  const graph = useMemo(
    () =>
      new RegExp(`^#/app/(.*?)/page/${pageUid}$`).exec(window.location.hash)[1],
    [pageUid]
  );
  const [stage, setStage] = useState<StageValue>(getStage);
  const CardContent = components[stage];
  return (
    <Card>
      <h4>Static Site Dashboard</h4>
      <CardContent setStage={setStage} pageUid={pageUid} graph={graph} />
    </Card>
  );
};

export const render = (p: HTMLDivElement): void =>
  ReactDOM.render(<StaticSiteDashboard />, p);

export default StaticSiteDashboard;