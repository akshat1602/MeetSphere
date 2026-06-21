import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import HomeIcon from "@mui/icons-material/Home";

export default function History() {
  const { getHistoryOfUser } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const routeTo = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getHistoryOfUser();

        // Log once to see exact shape
        console.log("history from context:", history);

        // CASE 1: history is already an array
        if (Array.isArray(history)) {
          setMeetings(history);
        }
        // CASE 2: axios-style { data: [...] }
        else if (history && Array.isArray(history.data)) {
          setMeetings(history.data);
        }
        // CASE 3: backend sent { meetings: [...] }
        else if (history && Array.isArray(history.meetings)) {
          setMeetings(history.meetings);
        } else {
          setMeetings([]); // fallback to empty
        }
      } catch (err) {
        console.error("failed to fetch history", err);
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [getHistoryOfUser]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div>
      <IconButton
        onClick={() => {
          routeTo("/home");
        }}
      >
        <HomeIcon />
      </IconButton>

      {loading && <p>Loading history...</p>}

      {!loading && Array.isArray(meetings) && meetings.length === 0 && (
        <p>No meetings in your history yet.</p>
      )}

      {!loading &&
        Array.isArray(meetings) &&
        meetings.length > 0 &&
        meetings.map((e, i) => (
          <Card key={e._id || i} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                Code: {e.meetingCode}
              </Typography>
              <Typography sx={{ mb: 1.5 }} color="text.secondary">
                Date: {formatDate(e.date)}
              </Typography>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}