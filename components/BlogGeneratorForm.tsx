import React, { useState} from "react";
import TitleWithTooltip from './TitleWithTooltip'
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';

type Props = {
	isLoadingBlog?: boolean
	generateBlog: Function
}

const BlogGeneratorForm = ({generateBlog, isLoadingBlog}: Props) => {
	const [blogTitleText, setBlogTitleText] = useState("")
	const [exampleBlogTitleText, setExampleBlogTitleText] = useState("")
	const [exampleBlogText, setExampleBlogText] = useState("")


	const getNumOfWords = () => {
		const len1 = exampleBlogTitleText.split(' ').length
		const len2 = blogTitleText.split(' ').length
		const len3 = exampleBlogText.split(' ').length
		return len1 + len2 + len3 -3
	}

  return (
		<div>
			<TitleWithTooltip titleText='New Blog Title' tooltipText='Input the title for the blog post you want to create'/>
			<input 
				value={blogTitleText} 
				onChange={(e) => setBlogTitleText(e.target.value)}
			/>
			<TitleWithTooltip titleText='Blog Example' tooltipText='Input the title for the sample blog post'/>
			<div>Blog Example Title</div>
			<input 
				value={exampleBlogTitleText} 
				onChange={(e) => setExampleBlogTitleText(e.target.value)}
			/>
			<div>Blog Example Text</div>
			<div className='pro-tip' style={{background: "#9ED1A9", borderRadius: '3px', width: "35vw"}}>
				<b style={{fontWeight: 'bold', color: 'blue'}}>PRO TIP</b>
				: For best results, include raw text only. Remove alt text from pasted images, blocks of whitespace and extra spaces, and any text from links. Leave the title out.
			</div>
			<textarea 
				value={exampleBlogText} 
				onChange={(e) => setExampleBlogText(e.target.value)}
				style={{width: '40vw', height: '40vh'}}
			/>
			<div>
				<div>{getNumOfWords()}/900</div>
				<Button 
					style={{minWidth: '120px', minHeight: "39px"}} 
					onClick={() => generateBlog(
						exampleBlogText,
						exampleBlogTitleText,
						blogTitleText
					)} 
					disableElevation variant="contained" color="primary"
				>
					{isLoadingBlog ? <CircularProgress color="inherit" size='26px'/> :"Generate"}
				</Button>
			</div>
		</div>
  );
};

export default BlogGeneratorForm;