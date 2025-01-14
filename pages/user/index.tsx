import React, { useCallback, useState } from "react";
import StandardLayout from "../../components/StandardLayout";
import {
  Body,
  Button,
  Card,
  DataLoader,
  ExternalLink,
  H6,
  Items,
  Loading,
  NumberField,
  StringField,
  Subtitle,
  VerticalTabs,
} from "@dvargas92495/ui";
import {
  useAuthenticatedAxiosGet,
  useAuthenticatedAxiosPut,
  useAuthenticatedAxiosPost,
} from "../../components/hooks";
import Link from "next/link";
import axios from "axios";
import { FLOSS_API_URL, stripe } from "../../components/constants";
import { useUser, SignedIn, UserProfile } from "@clerk/clerk-react";
import RedirectToLogin from "../../components/RedirectToLogin";

const UserValue: React.FunctionComponent = ({ children }) => (
  <span style={{ paddingLeft: 64, display: "block" }}>{children}</span>
);

const useEditableSetting = ({
  name,
  defaultValue,
  onSave = () => Promise.resolve(),
}: {
  name: string;
  defaultValue: string;
  onSave?: (value: string) => Promise<void>;
}) => {
  const [isEditable, setIsEditable] = useState(false);
  const [value, setValue] = useState(defaultValue);
  return {
    primary: (
      <UserValue>
        {isEditable ? (
          <StringField
            value={value}
            name={name}
            setValue={setValue}
            label={name}
            type={name === "password" ? "password" : "type"}
          />
        ) : (
          <Body>{defaultValue}</Body>
        )}
      </UserValue>
    ),
    action: isEditable ? (
      <Button
        startIcon="save"
        onClick={() => onSave(value).then(() => setIsEditable(false))}
      />
    ) : (
      <Button startIcon="edit" onClick={() => setIsEditable(true)} />
    ),
  };
};

const Settings = ({ name, email }: { name: string; email: string }) => {
  const axiosPut = useAuthenticatedAxiosPut();
  const onNameSave = useCallback(
    (n) => axiosPut("name", { name: n }).then(() => console.log("saved")),
    [axiosPut]
  );
  const { primary: namePrimary } = useEditableSetting({
    defaultValue: name,
    name: "name",
    onSave: onNameSave,
  });
  return (
    <Items
      items={[
        {
          primary: <UserValue>{email}</UserValue>,
          key: 0,
          avatar: <Subtitle>Email</Subtitle>,
        },
        {
          primary: namePrimary,
          key: 1,
          avatar: <Subtitle>Name</Subtitle>,
        },
      ]}
    />
  );
};

type PaymentMethod = {
  brand: string;
  last4: string;
  id: string;
};

type Subscription = {
  name: string;
  description: string;
  id: string;
  amount: number;
  interval: "mo" | "yr";
};

const ApiButton: React.FunctionComponent<{ request: () => Promise<void> }> = ({
  children,
  request,
}) => {
  const [loading, setLoading] = useState(false);
  const onClick = useCallback(() => {
    setLoading(true);
    request().catch(() => setLoading(false));
  }, [setLoading, request]);
  return (
    <>
      <Button onClick={onClick}>{children}</Button>
      <Loading loading={loading} />
    </>
  );
};

const Billing = () => {
  const [payment, setPayment] = useState<PaymentMethod>();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const authenticatedAxios = useAuthenticatedAxiosGet();
  const getPayment = useCallback(
    () =>
      authenticatedAxios("payment-methods").then((r) => {
        setPayment(r.data.defaultPaymentMethod);
        setPaymentMethods(r.data.paymentMethods);
      }),
    [authenticatedAxios, setPayment, setPaymentMethods]
  );
  const getSubscriptions = useCallback(
    () =>
      authenticatedAxios("subscriptions").then((r) =>
        setSubscriptions(r.data.subscriptions)
      ),
    [setSubscriptions]
  );
  return (
    <>
      <Items
        items={[
          {
            primary: (
              <UserValue>
                <DataLoader loadAsync={getPayment}>
                  {payment ? (
                    <Body>
                      {payment.brand} ends in {payment.last4}
                    </Body>
                  ) : (
                    <Body>No default card saved!</Body>
                  )}
                  <Items
                    items={paymentMethods
                      .filter((pm) => pm.id !== payment?.id)
                      .map((pm) => ({
                        primary: `${pm.brand} ends in ${pm.last4}`,
                        key: pm.id,
                        action: (
                          <>
                            <Button>Make Default</Button>
                            <ApiButton
                              request={() =>
                                axios
                                  .delete(
                                    `${FLOSS_API_URL}/stripe-payment-method?payment_method_id=${pm.id}`
                                  )
                                  .then(() =>
                                    setPaymentMethods(
                                      paymentMethods.filter(
                                        (p) => p.id !== pm.id
                                      )
                                    )
                                  )
                              }
                            >
                              Delete
                            </ApiButton>
                          </>
                        ),
                      }))}
                    noItemMessage={null}
                  />
                </DataLoader>
              </UserValue>
            ),
            key: 0,
            avatar: <Subtitle>Card</Subtitle>,
          },
        ]}
      />
      <hr />
      <H6>Services</H6>
      <DataLoader loadAsync={getSubscriptions}>
        <Items
          items={subscriptions.map((p) => ({
            primary: <UserValue>{p.name}</UserValue>,
            secondary: <UserValue>{p.description}</UserValue>,
            key: p.id,
            avatar: (
              <Subtitle>
                ${p.amount}/{p.interval}
              </Subtitle>
            ),
          }))}
          noItemMessage="No Currently Subscribed Services"
        />
      </DataLoader>
    </>
  );
};

const Funding = () => {
  const [balance, setBalance] = useState(0);
  const [subscriptionId, setSubscriptionId] = useState(0);
  const [sponsorship, setSponsorship] = useState(20);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const authenticatedAxios = useAuthenticatedAxiosGet();
  const authenticatedAxiosPost = useAuthenticatedAxiosPost();
  const getBalance = useCallback(
    () =>
      authenticatedAxios("balance").then((r) =>
        setBalance(parseFloat(r.data.balance))
      ),
    [setBalance, authenticatedAxios]
  );
  const loadItems = useCallback(
    () =>
      Promise.all([
        authenticatedAxios(
          `is-subscribed?product=${encodeURI("RoamJS Sponsor")}`
        ),
        authenticatedAxios("sponsorships"),
      ]).then(([s, r]) => {
        setSubscriptionId(s.data.subscriptionId);
        setItems(
          r.data.contracts.sort(
            (a, b) =>
              new Date(a.createdDate).valueOf() -
              new Date(b.createdDate).valueOf()
          )
        );
      }),
    [setItems, setSubscriptionId, authenticatedAxios]
  );
  const onClick = useCallback(() => {
    setLoading(true);
    authenticatedAxiosPost("subscribe-sponsorship", { sponsorship }).then(
      (r) => {
        if (r.data.active) {
          setLoading(false);
          setSubscriptionId(r.data.id);
          setBalance(balance + sponsorship * 1.25);
        } else {
          stripe.then((s) => s.redirectToCheckout({ sessionId: r.data.id }));
        }
      }
    );
  }, [
    balance,
    sponsorship,
    authenticatedAxiosPost,
    setSubscriptionId,
    setBalance,
  ]);
  return (
    <DataLoader loadAsync={loadItems}>
      {!subscriptionId && (
        <div>
          <Body>
            As a thank you for your recurring support, you will receive 125% of
            your monthly sponsorship amount as RoamJS credit which you could
            then use to prioritize projects on the{" "}
            <ExternalLink href="/queue">Queue</ExternalLink>. You will also be
            added to the <b>Thank You</b> section in the{" "}
            <ExternalLink href="/contribute">Contribute</ExternalLink> page.
          </Body>
          <div
            style={{
              padding: "32px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
            }}
          >
            <NumberField
              value={sponsorship}
              setValue={setSponsorship}
              variant="filled"
              label="Sponsorship"
              dimension="money"
            />
            <Button
              variant={"contained"}
              color={"primary"}
              onClick={onClick}
              disabled={loading}
            >
              SUBSCRIBE
            </Button>
            <Loading loading={loading} />
          </div>
          <Body>
            This ${sponsorship} subscription will give you ${sponsorship * 1.25}{" "}
            in RoamJS credit each month!
          </Body>
        </div>
      )}
      <Items
        items={[
          {
            primary: (
              <UserValue>
                <DataLoader loadAsync={getBalance}>
                  <H6>${balance}</H6>
                </DataLoader>
              </UserValue>
            ),
            key: 1,
            avatar: <Subtitle>Credit</Subtitle>,
          },
          ...items.map((f) => ({
            primary: (
              <UserValue>
                <H6>
                  <Link
                    href={`queue/${f.label}${f.link.substring(
                      "https://github.com/dvargas92495/roam-js-extensions/issues"
                        .length
                    )}`}
                  >
                    {f.name}
                  </Link>
                </H6>
              </UserValue>
            ),
            secondary: (
              <UserValue>
                {`Funded on ${f.createdDate}. Due on ${f.dueDate}`}
              </UserValue>
            ),
            key: f.uuid,
            avatar: <Subtitle>${f.reward}</Subtitle>,
          })),
        ]}
      />
    </DataLoader>
  );
};

const Profile = () => {
  const user = useUser();
  const [isClerk, setIsClerk] = useState(false);
  return (
    <>
      {isClerk ? (
        <UserProfile />
      ) : (
        <VerticalTabs title={"User Info"}>
          <Card title={"Details"}>
            <Settings
              name={user.fullName}
              email={user.primaryEmailAddress.emailAddress}
            />
          </Card>
          <Card title={"Billing"}>
            <Billing />
          </Card>
          <Card title={"Sponsorships"}>
            <Funding />
          </Card>
        </VerticalTabs>
      )}
      <button onClick={() => setIsClerk(!isClerk)} style={{ display: "none" }}>
        switch
      </button>
    </>
  );
};

const UserPage = (): JSX.Element => {
  return (
    <StandardLayout>
      <SignedIn>
        <Profile />
      </SignedIn>
      <RedirectToLogin />
    </StandardLayout>
  );
};

export default UserPage;
