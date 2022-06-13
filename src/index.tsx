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
import { useEffect, useMemo, useState } from "react";
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
    const userId = await LocalStorage.getItem<string>("userId");
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
      await LocalStorage.setItem("userId", (await client.get<ResponseUserMe>("/users/me")).data.user.id);
    }

    const {
      data: { incidents },
    } = await client.get<ResponseIncidents>("/incidents?statuses[]=triggered&statuses[]=acknowledged");

    return {
      incidents,
    };
  });

  if (error) {
    showToast(Toast.Style.Failure, error);
  }

  return (
    <List isLoading={!data && !error} enableFiltering navigationTitle="All Open Incidents">
      {data?.incidents && data.incidents.length > 0 && <IncidentItems incidents={data.incidents} />}
      {data?.incidents && data.incidents.length === 0 && <List.EmptyView title="No incidents 🎉" />}
    </List>
  );
};

const IncidentItems = ({ incidents }: { incidents: ResponseIncidents["incidents"] }) => {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const loadUserId = async () => {
      setUserId((await LocalStorage.getItem<string>("userId")) ?? null);
    };
    loadUserId();
  }, []);

  const groupedIncidents = useMemo(
    () =>
      incidents
        .sort((incidentA, incidentB) => (new Date(incidentA.created_at) > new Date(incidentB.created_at) ? -1 : 1))
        .sort((incident) => (incident.status === "triggered" ? -1 : 1))
        .reduce<{ mine: ResponseIncidents["incidents"]; others: ResponseIncidents["incidents"] }>(
          (grouped, incident) => {
            const assignedToMe = incident.assignments.some((assignment) => assignment.assignee.id === userId);
            return {
              mine: assignedToMe ? [...grouped.mine, incident] : grouped.mine,
              others: assignedToMe ? grouped.others : [...grouped.others, incident],
            };
          },
          { mine: [], others: [] }
        ),
    [incidents]
  );

  return (
    <>
      <List.Section title="Assigned to me">
        {groupedIncidents.mine.map((incident) => (
          <IncidentItem key={incident.id} mine incident={incident} />
        ))}
      </List.Section>
      <List.Section
        title={groupedIncidents.mine.length === 0 ? "Others while there is no assinged incidents to you" : "Others"}
        subtitle={`${groupedIncidents.others.length}`}
      >
        {groupedIncidents.others.map((incident) => (
          <IncidentItem key={incident.id} incident={incident} />
        ))}
      </List.Section>
    </>
  );
};

const IncidentItem = ({
  incident,
  mine = false,
}: {
  incident: ResponseIncidents["incidents"][number];
  mine?: boolean;
}) => {
  return (
    <List.Item
      title={incident.summary}
      accessories={[{ text: incident.service.summary }]}
      icon={{
        source: mine ? Icon.Pin : Icon.ExclamationMark,
        tintColor: incident.status === "triggered" ? Color.Red : Color.Yellow,
      }}
      actions={
        <ActionPanel title="hello">
          <Action.OpenInBrowser url={incident.html_url} />
        </ActionPanel>
      }
    />
  );
};
