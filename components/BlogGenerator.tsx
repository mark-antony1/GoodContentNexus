import React, { useState} from "react";
import TitleWithTooltip from './TitleWithTooltip'
import BlogLikeButtons from './BlogLikeButtons'
import BlogGeneratorForm from './BlogGeneratorForm'
import { useRouter } from 'next/router'
import gql from "graphql-tag";
import { useQuery, useMutation } from "urql";

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

const maxRetries = 18

const BlogGenerator: React.FC = () => {
	const router = useRouter()
	const [generatedBlogText, setGeneratedBlogText] = useState("")
	const [isLoadingBlog, setIsLoadingBlog] = useState(false)
	const [workerJobId, setWorkerJobId] = useState("")
	const [shouldFetchDocument, setShouldFetchDocument] = useState(false)
	const [blogGenerationError, setBlogGenerationError] = useState("")
	const [retryAttempts, setRetryAttempts] = useState(0)


	const [createDocumentResult, createDocument] = useMutation(CreateDocument);
	const [fetchOrUpdateBlogResult, fetchOrUpdateBlog] = useMutation(FetchOrUpdateBlog);

	const [documentResult, document] = useQuery({
		query: Document,
		variables: { workerJobId },
		pause: workerJobId === ""
	});

	if(shouldFetchDocument && retryAttempts < maxRetries) {
		setShouldFetchDocument(false)
		const newRetryAttempts = retryAttempts + 1
		setRetryAttempts(newRetryAttempts)
		fetchOrUpdateBlog({
			workerJobId
		}).then(res => {
			const { data, error } = res
			if (data && !error) {
				setGeneratedBlogText(res.data.fetchOrUpdateBlog.generated_blog_text)
				setIsLoadingBlog(false)
			} else if (newRetryAttempts < maxRetries) {
				if(error.message.includes("reach database server")) {
					setBlogGenerationError("Your internet connection is unstable")
				}
				setTimeout(() => setShouldFetchDocument(true), 10000)
			} else if (newRetryAttempts >= maxRetries) {
				setBlogGenerationError("The blog post took too long to generate, please try again or improve your internet connection")
				setGeneratedBlogText("Sorry, we had an issue and failed to generate the content :(")
				setIsLoadingBlog(false)
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
			if (res && res.data && !res.error) {
				setWorkerJobId(res.data.createDocument.worker_job_id)
				setGeneratedBlogText(waitingText)
				setRetryAttempts(0)
				setShouldFetchDocument(true)
			} else if (res.error.message.includes("does not have token")) {
				setBlogGenerationError("You are not Signed In, redirecting you to login page")
				setIsLoadingBlog(false)
				setTimeout(() => router.push('/login'), 2000)
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
					{blogGenerationError !== "" ? <div style={{ width: '45vw', color: "red", marginBottom: "8vh", height: "2vh" }}>{blogGenerationError}</div> : <div style={{marginBottom: "8vh", height: "2vh"}}></div>}
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

4) The model often generates incorrect information, please fact check the generated copy

5) Longer pieces can take up to ~3 minutes to generate a blog post

6) If you post any raw output, please make it clear in the published copy that the output was machine generated

7) If you encounter any problems, please reach out to us at human@goodcontent.ai`

export default BlogGenerator;