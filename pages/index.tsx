import Layout from '../components/Layout'
import BlogGenerator from "../components/BlogGenerator";
import { useRouter } from 'next/router'
import { useQuery, useMutation } from "urql";
import gql from "graphql-tag";


const UserQuery = gql`
  query{
    user{
      id
      first_name
    }
  }
`;

const getQueryResult = () => {
  const [userQueryResult] = useQuery({
    query: UserQuery,
  })
  return userQueryResult
}


const IndexPage = () => {
	const router = useRouter()
	if (typeof window !== 'undefined') {
    const {fetching, error} = getQueryResult()
    if(fetching || error !== undefined) {
      if(error !== undefined) {
        router.push('/login')
      }
      return(
        <Layout title="App | Goodcontent.ai">
          <div style={{textAlign: 'center'}}>Loading...</div>
        </Layout>
      )
    }
  }
  
  return(
    <Layout title="App | Goodcontent.ai">
      <BlogGenerator/>
    </Layout>
  )
}

export default IndexPage
