import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Typography variant="h4" fontWeight={800} color="primary" mb={3}>
        co14ners
      </Typography>
      <Paper elevation={0} variant="outlined" sx={{ p: 4, width: "100%", maxWidth: 420 }}>
        {children}
      </Paper>
    </Box>
  );
}
