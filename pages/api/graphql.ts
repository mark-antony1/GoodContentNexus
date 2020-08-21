import app, { server } from "nexus";
import Cors from "micro-cors";
import "../../graphql/schema"; // we'll create this file in a second!

const cors = Cors({
  allowMethods: ["GET", "POST", "OPTIONS"]
});

app.assemble();

export default cors(server.handlers.graphql);