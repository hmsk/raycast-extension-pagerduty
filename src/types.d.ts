interface ResponseUserMe {
  user: {
    id: string;
  };
}

interface ResponseIncidents {
  incidents: {
    id: string;
    created_at: string;
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
