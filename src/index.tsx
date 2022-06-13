import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import axios from "axios";
import useSWR from "swr";

export default function Command() {
  return (
    <List>
      <List.Item
        icon={{
          source: Icon.List,
        }}
        title="All Open Incidents"
        actions={
          <ActionPanel>
            <Action.Push title="Show" target={<AllOpenIncidents />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

const AllOpenIncidents = () => {
  const apiKey = getPreferenceValues<{ apiKey: string }>().apiKey;

  const { data, error } = useSWR(apiKey, async (apiKey) => {
    const userId = await LocalStorage.getItem("userId");
    const client = axios.create({
      baseURL: "https://api.pagerduty.com",
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    });
    client.interceptors.response.use(undefined, (error) => {
      return Promise.reject(`${error.config.url}: ${error.response.data.error}`);
    });

    if (!userId) {
      await LocalStorage.setItem("userId", (await client.get("/users/me")).data.user.id);
    }

    const {
      data: { incidents },
    } = await client.get("/incidents?statuses[]=triggered&statuses[]=acknowledged");

    return {
      incidents,
    };
  });

  if (error) {
    showToast(Toast.Style.Failure, error);
  }

  return (
    <List isLoading={!data && !error} enableFiltering navigationTitle="All Opened Incidents">
      {data?.incidents && data.incidents.length > 0 && <IncidentItems incidents={data.incidents} />}
      {data?.incidents && data.incidents.length === 0 && <List.EmptyView title="No incidents 🎉" />}
    </List>
  );
};

const IncidentItems = ({ incidents }) => {
  const userId = LocalStorage.getItem("userId");

  return (
    <>
      {incidents
        .sort((incident) =>
          incident.status === "triggered" ||
          incident.assignments.some((assignment) => assignment.assignee.id === userId)
            ? -1
            : 1
        )
        .map((incident) => (
          <List.Item
            key={incident.id}
            title={incident.summary}
            accessories={[{ text: incident.service.summary }]}
            icon={{
              source: incident.assignments.some((assignment) => assignment.assignee.id === userId)
                ? Icon.Pin
                : Icon.ExclamationMark,
              tintColor: incident.status === "triggered" ? Color.Red : Color.Yellow,
            }}
            actions={
              <ActionPanel title="hello">
                <Action.OpenInBrowser url={incident.html_url} />
              </ActionPanel>
            }
          />
        ))}
    </>
  );
};
