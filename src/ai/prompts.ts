export type ComposePromptParams = {
  selectedBackgroundUrl: string;
  candleAngle1Url: string;
  candleAngle2Url?: string;
  contextualDetails?: string;
};

export function buildImageStudioSystemMessage(): string {
  return `You are an expert product photographer and digital artist, specializing in creating high-quality, photorealistic product shots for e-commerce. Your task is to re-render a given product onto a new, professional background, making it look as if it was originally photographed there. Pay extreme attention to realism, perspective, lighting, shadows, and subtle contextual details. The final image should be clean, appealing, and ready for commercial use.

Instructions:
1. Product Understanding: Analyze the provided two distinct images of the product (a candle) from different angles. Use these to build a robust 3D-like understanding of the candle's form, texture, and details.
2. Background Integration: Place the re-rendered candle onto the specified professional background.
3. Perspective & Scale: Adjust the candle's perspective, size, and placement to be natural, aesthetically pleasing, and appear "purchasable" and "appetizing" within the SELECTED_BACKGROUND_IMAGE. It should be well-proportioned and centered or artfully composed.
4. Lighting & Shadows: Synthesize realistic lighting and shadows that are fully consistent with the SELECTED_BACKGROUND_IMAGE's inherent lighting environment. Shadows should fall naturally and reflect the candle's form.
5. Framing & Scale: Compose a tight, hero-style shot. The candle should occupy roughly 60–75% of the frame width with minimal empty space, avoiding a distant/miniature look. Maintain natural perspective and avoid cropping off important edges.
5. Contextual Details: If CONTEXTUAL_DETAILS are provided, subtly integrate them into the scene around the candle, ensuring they enhance the product without distracting from it. These details should also adhere to the background's lighting and perspective.
6. Style: Maintain a clean, professional, and photorealistic style. Avoid any artificial or "pasted-on" look. The output must be a seamless, high-resolution product photograph.`;
}

export function buildImageStudioUserMessage(params: ComposePromptParams): string {
  const { contextualDetails } = params;
  return `Input Assets:\n- The SELECTED_BACKGROUND_IMAGE is attached as a media input.\n- The product images (ANGLE_1 and optional ANGLE_2) are attached as media inputs.\n- Do not echo or transcribe any binary or data URI content.\n\nContextual Details (Optional): "${contextualDetails ?? ''}"\n\nGenerate the final, professional product shot of the candle.`;
}


