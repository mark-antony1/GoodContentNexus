import React, { useState} from "react";
import TitleWithTooltip from './TitleWithTooltip'
import Button from '@material-ui/core/Button';
import BlogLikeButtons from './BlogLikeButtons'
import BlogGeneratorForm from './BlogGeneratorForm'
import CircularProgress from '@material-ui/core/CircularProgress';
import gql from "graphql-tag";
import { useRouter } from 'next/router'
import { useQuery, useMutation } from "urql";


const UserQuery = gql`
  query($token: String!) {
    user(token: $token) {
      id
      first_name
    }
  }
`;

const CreateDocument = gql`
	mutation($title: String!, $exampleBlogText: String!, $exampleBlogTitleText: String!) {
		createDocument(title: $title, example_blog_text: $exampleBlogText, example_title: $exampleBlogTitleText) {
			id
			worker_job_id
			generated_blog_text
    }
	}`
;

const Document = gql`
	query($workerJobId: String!) {
		document(worker_job_id: $workerJobId) {
			id
			generated_blog_text
    }
	}`
;

const FetchOrUpdateBlog = gql`
	mutation($workerJobId: String!) {
		fetchOrUpdateBlog(worker_job_id: $workerJobId) {
			id
			generated_blog_text
    }
	}`
;

const maxRetries = 13


type UserQueryData = {
  user: {
    id: string;
    first_name: string;
  };
};


const BlogGenerator: React.FC = () => {
	const [generatedBlogText, setGeneratedBlogText] = useState("")
	const [isLoadingBlog, setIsLoadingBlog] = useState(false)
	const [workerJobId, setWorkerJobId] = useState("")
	const [shouldFetchDocument, setShouldFetchDocument] = useState(false)
	const [blogGenerationError, setBlogGenerationError] = useState("")
	const [retryAttempts, setRetryAttempts] = useState(0)


	const [createDocumentResult, createDocument] = useMutation(CreateDocument);
	const [fetchOrUpdateBlogResult, fetchOrUpdateBlog] = useMutation(FetchOrUpdateBlog);

	if (typeof window !== 'undefined') {
		const router = useRouter()
		const [userQueryResult] = useQuery({
			query: UserQuery,
			variables: {token: "localStorage.getItem('token')"}
		})
		if(userQueryResult.error !== undefined) {
			router.push('/login')
		}
	}

	const [documentResult, document] = useQuery({
		query: Document,
		variables: { workerJobId },
		pause: workerJobId === ""
	});

	if(shouldFetchDocument && retryAttempts < maxRetries) {
		setShouldFetchDocument(false)
		setRetryAttempts(retryAttempts + 1)
		fetchOrUpdateBlog({
			workerJobId
		}).then(res => {
			if (res && res.data && !res.error) {
				setGeneratedBlogText(res.data.fetchOrUpdateBlog.generated_blog_text)
				setIsLoadingBlog(false)
			} else if (retryAttempts < maxRetries) {
				setTimeout(() => setShouldFetchDocument(true), 10000)
			} else {
				setBlogGenerationError("There was an error generating this blog post")
				setGeneratedBlogText("Sorry, we had an issue and failed to generate the content :(")
				setIsLoadingBlog(false)
			}
		})
	}

	const generateBlog = (exampleBlogText: String, exampleBlogTitleText: String, blogTitleText: String) => {
		setIsLoadingBlog(true)
		setBlogGenerationError("")
		createDocument({
			title: blogTitleText,
			exampleBlogText,
			exampleBlogTitleText
		}).then(res => {
			if (res && res.data) {
				setWorkerJobId(res.data.createDocument.worker_job_id)
				setGeneratedBlogText(waitingText)
				setRetryAttempts(0)
				setShouldFetchDocument(true)
			} else {
				setBlogGenerationError("There was an error generating this blog post")
				setGeneratedBlogText("Sorry, we had an issue and failed to generate the content :(")
			}
		})
	}

  return (
		<div style={{padding: '0 5vw 0 5vw'}}>
      <div style={{display: 'flex', justifyContent: 'space-between'}}>
				<BlogGeneratorForm generateBlog={generateBlog} isLoadingBlog={isLoadingBlog}/>
        <div>
					<TitleWithTooltip titleText='Blog Output' tooltipText='this is the generated text for the blog you are creating'/>
					<textarea 
						disabled
						value={generatedBlogText} 
						style={{width: '45vw', height: '60vh'}}
					/>
					{blogGenerationError !== "" ? <div style={{color: "red", marginBottom: "8vh", height: "2vh" }}>{blogGenerationError}</div> : <div style={{marginBottom: "8vh", height: "2vh"}}></div>}
					<BlogLikeButtons/>
        </div>
      </div>
    </div>
  );
};

const waitingText = `
Generating content please wait... also please keep the following in mind 

1) It may take several attempts before you recieve generated content that resembles any quality

2) The quality of generated output is highly dependent on the example blog provided 

3) This model can ouput things seen as 'toxic' please use your best judgment to refrain from using such material 

4) Please make sure to make it clear in your published copy that it was machine generated

5) The model often generates incorrect information, please fact check the generated copy

6) Longer pieces can take up to ~2 minutes to generate a blog post

7) If you encounter any problems, please reach out to us at human@goodcontent.ai`

export default BlogGenerator;