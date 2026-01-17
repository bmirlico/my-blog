import type { APIRoute } from "astro";
import { createHmac } from "node:crypto";

// Hashnode webhook payload types (real format from Hashnode)
interface HashnodeWebhookPayload {
	metadata: { uuid: string };
	data: {
		publication: { id: string };
		post: { id: string };
		eventType: "post_published" | "post_updated" | "post_deleted";
	};
}

// Post details fetched from GraphQL
interface PostDetails {
	id: string;
	title: string;
	slug: string;
	brief: string;
	coverImage?: { url: string };
}

// Verify Hashnode webhook signature
// Format: "t=1234567890,v1=abc123..."
function verifyHashnodeSignature(
	payload: string,
	signatureHeader: string,
	secret: string,
): boolean {
	// Parse "t=timestamp,v1=signature"
	const parts = signatureHeader.split(",");
	const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
	const signature = parts.find((p) => p.startsWith("v1="))?.slice(3);

	if (!timestamp || !signature) {
		console.error("[Newsletter Notify] Invalid signature format");
		return false;
	}

	// Signed payload = "timestamp.body"
	const signedPayload = `${timestamp}.${payload}`;
	const expectedSignature = createHmac("sha256", secret)
		.update(signedPayload)
		.digest("hex");

	return signature === expectedSignature;
}

// Fetch post details from Hashnode GraphQL API
async function fetchPostById(postId: string): Promise<PostDetails | null> {
	const query = `
		query GetPostById($id: ObjectId!) {
			post(id: $id) {
				id
				title
				slug
				brief
				coverImage { url }
			}
		}
	`;

	try {
		const response = await fetch("https://gql.hashnode.com", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ query, variables: { id: postId } }),
		});

		const data = await response.json();

		if (data.errors) {
			console.error("[Newsletter Notify] GraphQL errors:", data.errors);
			return null;
		}

		return data?.data?.post || null;
	} catch (error) {
		console.error("[Newsletter Notify] Error fetching post:", error);
		return null;
	}
}

// Fetch template from Brevo and replace placeholders
async function getProcessedTemplate(
	brevoApiKey: string,
	templateId: number,
	params: Record<string, string>,
): Promise<{ htmlContent: string; subject: string; sender: { name: string; email: string } }> {
	const templateResponse = await fetch(
		`https://api.brevo.com/v3/smtp/templates/${templateId}`,
		{
			method: "GET",
			headers: { "api-key": brevoApiKey },
		},
	);

	if (!templateResponse.ok) {
		throw new Error(`Failed to fetch template: ${templateResponse.status}`);
	}

	const templateData = await templateResponse.json();
	let htmlContent = templateData.htmlContent as string;
	let subject = templateData.subject as string;

	// Replace all {{ params.xxx }} placeholders
	for (const [key, value] of Object.entries(params)) {
		const placeholder = new RegExp(`\\{\\{\\s*params\\.${key}\\s*\\}\\}`, "g");
		htmlContent = htmlContent.replace(placeholder, value);
		subject = subject.replace(placeholder, value);
	}

	return {
		htmlContent,
		subject,
		sender: {
			name: templateData.sender?.name || "The Learning Machine",
			email: templateData.sender?.email || "newsletter@thelearningmachine.dev",
		},
	};
}

export const POST: APIRoute = async ({ request }) => {
	try {
		// Get raw body for signature verification
		const rawBody = await request.text();

		// Verify Hashnode signature
		const hashnodeSecret = import.meta.env.HASHNODE_WEBHOOK_SECRET;
		const signature = request.headers.get("x-hashnode-signature");

		if (hashnodeSecret && signature) {
			if (!verifyHashnodeSignature(rawBody, signature, hashnodeSecret)) {
				console.error("[Newsletter Notify] Invalid Hashnode signature");
				return new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
					headers: { "Content-Type": "application/json" },
				});
			}
		}

		// Parse webhook payload (Hashnode real format)
		const payload: HashnodeWebhookPayload = JSON.parse(rawBody);
		const eventType = payload.data.eventType;
		const postId = payload.data.post.id;

		console.log("[Newsletter Notify] Received webhook:", eventType, "postId:", postId);

		// Only process post_published events
		if (eventType !== "post_published") {
			console.log("[Newsletter Notify] Ignoring event:", eventType);
			return new Response(
				JSON.stringify({ message: "Event ignored", event: eventType }),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}

		// Fetch post details from Hashnode GraphQL API
		const post = await fetchPostById(postId);

		if (!post || !post.title || !post.slug) {
			console.error("[Newsletter Notify] Could not fetch post details for ID:", postId);
			return new Response(JSON.stringify({ error: "Could not fetch post details" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		console.log("[Newsletter Notify] Post details fetched:", post.title);

		// Get Brevo configuration
		const brevoApiKey = import.meta.env.BREVO_API_KEY;
		const brevoListId = import.meta.env.BREVO_LIST_ID;
		const brevoTemplateId = import.meta.env.BREVO_CAMPAIGN_TEMPLATE_ID;

		if (!brevoApiKey || !brevoListId || !brevoTemplateId) {
			console.error("[Newsletter Notify] Missing Brevo configuration");
			return new Response(
				JSON.stringify({ error: "Newsletter service not configured" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		const listId = Number.parseInt(brevoListId, 10);
		const templateId = Number.parseInt(brevoTemplateId, 10);

		// Prepare template parameters
		const articleUrl = `https://thelearningmachine.dev/articles/${post.slug}`;
		const templateParams: Record<string, string> = {
			title: post.title,
			brief: post.brief || "",
			articleUrl: articleUrl,
			coverImageUrl: post.coverImage?.url || "",
		};

		// Fetch and process template (includes sender info)
		console.log("[Newsletter Notify] Fetching template:", templateId);
		const template = await getProcessedTemplate(brevoApiKey, templateId, templateParams);

		// Schedule campaign 4 minutes from now (to allow Vercel build to complete)
		const scheduledAt = new Date(Date.now() + 4 * 60 * 1000);

		// Create campaign via Brevo API
		const campaignData = {
			name: `New Post: ${post.title} - ${Date.now()}`,
			subject: template.subject,
			sender: template.sender,
			htmlContent: template.htmlContent,
			recipients: {
				listIds: [listId],
			},
			scheduledAt: scheduledAt.toISOString(),
		};

		console.log("[Newsletter Notify] Creating campaign scheduled for:", scheduledAt.toISOString());

		const campaignResponse = await fetch("https://api.brevo.com/v3/emailCampaigns", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"api-key": brevoApiKey,
			},
			body: JSON.stringify(campaignData),
		});

		if (!campaignResponse.ok) {
			const errorData = await campaignResponse.json().catch(() => ({}));
			console.error("[Newsletter Notify] Failed to create campaign:", errorData);
			return new Response(
				JSON.stringify({ error: "Failed to create campaign", details: errorData }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		const campaignResult = await campaignResponse.json();
		console.log("[Newsletter Notify] Campaign created successfully:", campaignResult.id);

		return new Response(
			JSON.stringify({
				success: true,
				message: "Newsletter scheduled",
				campaignId: campaignResult.id,
				scheduledAt: scheduledAt.toISOString(),
				articleTitle: post.title,
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("[Newsletter Notify] Error:", error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "An unexpected error occurred",
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};
