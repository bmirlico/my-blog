import type { APIRoute } from "astro";
import { createHmac } from "node:crypto";

// Hashnode webhook payload types
interface HashnodeWebhookPayload {
	event: "post_published" | "post_updated" | "post_deleted";
	post: {
		id: string;
		title: string;
		slug: string;
		brief: string;
		url: string;
		coverImage?: {
			url: string;
		};
		author: {
			name: string;
		};
		publication: {
			id: string;
		};
	};
}

// Verify Hashnode webhook signature
function verifyHashnodeSignature(
	payload: string,
	signature: string,
	secret: string,
): boolean {
	const expectedSignature = createHmac("sha256", secret)
		.update(payload)
		.digest("hex");
	return signature === expectedSignature;
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

		// Parse webhook payload
		const payload: HashnodeWebhookPayload = JSON.parse(rawBody);

		console.log(
			"[Newsletter Notify] Received webhook:",
			payload.event,
			payload.post?.title,
		);

		// Only process post_published events
		if (payload.event !== "post_published") {
			console.log("[Newsletter Notify] Ignoring event:", payload.event);
			return new Response(
				JSON.stringify({ message: "Event ignored", event: payload.event }),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}

		// Validate payload
		if (!payload.post?.title || !payload.post?.slug) {
			console.error("[Newsletter Notify] Invalid payload - missing title or slug");
			return new Response(JSON.stringify({ error: "Invalid payload" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

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
		const articleUrl = `https://thelearningmachine.dev/articles/${payload.post.slug}`;
		const templateParams: Record<string, string> = {
			title: payload.post.title,
			brief: payload.post.brief || "",
			articleUrl: articleUrl,
			coverImageUrl: payload.post.coverImage?.url || "",
		};

		// Fetch and process template (includes sender info)
		console.log("[Newsletter Notify] Fetching template:", templateId);
		const template = await getProcessedTemplate(brevoApiKey, templateId, templateParams);

		// Schedule campaign 4 minutes from now (to allow Vercel build to complete)
		const scheduledAt = new Date(Date.now() + 4 * 60 * 1000);

		// Create campaign via Brevo API
		const campaignData = {
			name: `New Post: ${payload.post.title} - ${Date.now()}`,
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
				articleTitle: payload.post.title,
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
