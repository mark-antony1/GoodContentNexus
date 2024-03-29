import React from "react";
import { withUrqlClient, NextUrqlAppContext } from "next-urql";
import NextApp, { AppProps } from "next/app";
import fetch from "isomorphic-unfetch";
import "../styles/global.css"
import "../public/static/style.css"

// the URL to /api/graphql
const GRAPHQL_ENDPOINT = `/api/graphql`;

const App = ({ Component, pageProps }: AppProps) => {
  return <Component {...pageProps} />;
};

App.getInitialProps = async (ctx: NextUrqlAppContext) => {
  const appProps = await NextApp.getInitialProps(ctx);
  return { ...appProps };
};

export default withUrqlClient((_ssrExchange, _ctx) => ({
  url: GRAPHQL_ENDPOINT,
  fetchOptions: {
    headers: {
      credentials: "include"
    },
  },
  // fetch,
}))(
  // @ts-ignore
  App
);