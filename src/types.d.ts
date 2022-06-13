interface ResponseUserMe {
  user: {
    id: string;
  };
}

interface ResponseIncidents {
  incidents: {
    id: string;
    status: "triggered" | "acknowledged" | "resolved";
    html_url: string;
    summary: string;
    service: {
      summary: string;
    };
    assignments: {
      assignee: {
        id: string;
      };
    }[];
  }[];
}
