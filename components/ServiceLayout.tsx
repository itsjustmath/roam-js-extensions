import {
  Breadcrumbs,
  Button,
  ConfirmationDialog,
  H1,
  H3,
  H4,
  IconButton,
  StringField,
  Subtitle,
} from "@dvargas92495/ui";
import React, { useCallback, useEffect, useRef, useState } from "react";
import StandardLayout from "./StandardLayout";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { useRouter } from "next/router";
import { useAuthenticatedAxiosPost, useCopyCode } from "./hooks";
import { API_URL, stripe } from "./constants";
import axios from "axios";
import { GetStaticProps } from "next";

export type ServicePageProps = {
  description: string;
  price: number;
  image: string;
  id: string;
};

export const findById = (id: string) => ({ name }: { name: string }): boolean =>
  name.toLowerCase() === `roamjs ${id.split("-").slice(-1)}`;

export const getStaticPropsForPage: (
  id: string
) => GetStaticProps<ServicePageProps> = (id: string) => () =>
  axios
    .get(`${API_URL}/products`)
    .then((r) => r.data.products.find(findById(id)))
    .then((p) => ({
      props: {
        description: p.description,
        price: p.prices[0].price / 100,
        image: p.image || `/thumbnails/${id}.png`,
        id,
      },
    }))
    .catch(() => ({
      props: {
        description: "Failed to load description",
        price: 0,
        image: "",
        id,
      },
    }));

const idToTitle = (id: string) =>
  id
    .split("-")
    .map((s) => `${s.substring(0, 1).toUpperCase()}${s.substring(1)}`)
    .join(" ");

const idToCamel = (id: string) =>
  `${id.substring(0, 1)}${idToTitle(id).replace(/ /g, "").substring(1)}`;

const LaunchButton: React.FC<{
  start: () => void;
  id: string;
  price: number;
  refreshUser: () => void;
}> = ({ start, id, price, refreshUser }) => {
  const {
    query: { started },
  } = useRouter();
  const authenticatedAxiosPost = useAuthenticatedAxiosPost();
  const startService = useCallback(
    () =>
      authenticatedAxiosPost("start-service", { service: id }).then((r) =>
        r.data.sessionId
          ? stripe.then((s) =>
              s
                .redirectToCheckout({
                  sessionId: r.data.sessionId,
                })
                .catch((e) => console.error(e))
            )
          : refreshUser()
      ),
    [authenticatedAxiosPost]
  );
  return (
    <ConfirmationDialog
      action={startService}
      buttonText={"Start Now"}
      content={`By clicking submit below, you will subscribe to the RoamJS Service: ${idToTitle(
        id
      )} for $${price}/month.`}
      onSuccess={start}
      title={`RoamJS ${idToTitle(id)}`}
      defaultIsOpen={started === 'true'}
    />
  );
};

const CheckSubscription = ({
  id,
  start,
  children,
  price,
}: {
  id: string;
  start: () => void;
  price: number;
  children: (button: React.ReactNode) => React.ReactNode;
}) => {
  const user = useUser();
  const { publicMetadata } = user;
  useEffect(() => {
    if (publicMetadata[idToCamel(id)]) {
      start();
    }
  }, [start, publicMetadata, id]);
  return (
    <>
      {children(
        <LaunchButton
          start={start}
          id={id}
          price={price}
          refreshUser={() =>
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore refresh metadata state
            user.update()
          }
        />
      )}
    </>
  );
};

const CopyButton: React.FC<{ token: string }> = ({ token }) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(0);
  const onClick = useCallback(() => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    timeoutRef.current = window.setTimeout(() => setCopied(false), 5000);
  }, [token, setCopied, timeoutRef]);
  useEffect(() => () => window.clearTimeout(timeoutRef.current));
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <IconButton size={"small"} icon={"fileCopy"} onClick={onClick} />
      <span>{copied && "Copied!"}</span>
    </div>
  );
};

const Service = ({ id, end }: { id: string; end: () => void }) => {
  const userData = useUser().publicMetadata as {
    [key: string]: { token: string };
  };
  const authenticatedAxiosPost = useAuthenticatedAxiosPost();
  const camel = idToCamel(id);
  const token = userData?.[camel]?.token || "NO TOKEN FOUND FOR USER";
  const [copied, setCopied] = useState(false);
  const onSave = useCopyCode(setCopied, `window.roamjs${camel}Token = "${token}";\n`);
  const onEnd = useCallback(
    () => authenticatedAxiosPost("end-service", { service: id }),
    [authenticatedAxiosPost]
  );
  return (
    <div
      style={{
        marginTop: 32,
      }}
    >
      <H3>Thanks for subscribing!</H3>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 32,
          flexDirection: "column",
          width: "fit-content",
        }}
      >
        First, copy the extension into your Roam Graph
        <Button
          onClick={() => onSave([id])}
          color="primary"
          variant="contained"
        >
          COPY EXTENSION
        </Button>
        <span style={{ marginLeft: 24, minHeight: 20 }}>
          {copied && "COPIED!"}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "normal",
          justifyContent: "space-between",
        }}
      >
        <StringField
          value={token}
          disabled
          setValue={() => token}
          label={`RoamJS ${idToTitle(id)} Token`}
          style={{ cursor: "text", flexGrow: 1, paddingRight: 24 }}
        />
        <CopyButton token={token} />
      </div>
      <span style={{ color: "darkred" }}>
        Token is sensitive. <b>DO NOT SHARE WITH ANYONE</b>
      </span>
      <div style={{ marginTop: 128 }}>
        <ConfirmationDialog
          buttonText={"End Service"}
          color="secondary"
          title={`Ending ${idToTitle(id)}`}
          content={`Are you sure you want to unsubscribe from the RoamJS ${idToTitle(
            id
          )}`}
          action={onEnd}
          onSuccess={end}
        />
      </div>
    </div>
  );
};

const ServiceLayout = ({
  children,
  development,
  description,
  price,
  image,
  id,
}: {
  children: React.ReactNode;
  development?: boolean;
} & ServicePageProps): React.ReactElement => {
  const [started, setStarted] = useState(false);
  const router = useRouter();
  const start = useCallback(() => setStarted(true), [setStarted]);
  const end = useCallback(() => setStarted(false), [setStarted]);
  const login = useCallback(() => router.push(`/login?service=${id}`), [
    router,
  ]);
  const SplashLayout: React.FC<{ StartNowButton: React.ReactNode }> = ({
    StartNowButton,
  }) => (
    <>
      <div style={{ display: "flex" }}>
        <div style={{ width: "50%" }}>
          <H1>{idToTitle(id)}</H1>
          <Subtitle>{description}</Subtitle>
          <div style={{ marginBottom: 16 }} />
          <b>${price}/month</b>
          <div>{StartNowButton}</div>
        </div>
        <div style={{ width: "50%", padding: "0 32px" }}>
          <span
            style={{
              display: "inline-block",
              verticalAlign: "middle",
              height: "100%",
            }}
          />
          <img
            src={image}
            style={{
              verticalAlign: "middle",
              width: "100%",
              boxShadow: "0px 3px 14px #00000040",
              borderRadius: 8,
            }}
          />
        </div>
      </div>
      <hr style={{ margin: "32px 0" }} />
      <H4>Overview</H4>
      {children}
    </>
  );
  return (
    <StandardLayout>
      <Breadcrumbs
        page={`${id.replace(/-/g, " ").toUpperCase()}${
          development ? " (UNDER DEVELOPMENT)" : ""
        }`}
        links={[
          {
            text: "SERVICES",
            href: "/services",
          },
        ]}
      />
      <SignedIn>
        <CheckSubscription id={id} start={start} price={price}>
          {(StartNowButton) =>
            started ? (
              <Service id={id} end={end} />
            ) : (
              <SplashLayout StartNowButton={StartNowButton} />
            )
          }
        </CheckSubscription>
      </SignedIn>
      <SignedOut>
        <SplashLayout
          StartNowButton={
            <Button color={"primary"} variant={"contained"} onClick={login}>
              Start Now
            </Button>
          }
        />
      </SignedOut>
    </StandardLayout>
  );
};

export default ServiceLayout;
