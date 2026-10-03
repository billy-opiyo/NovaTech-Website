import { z } from "zod"

export const productAttributeTypeSchema = z.enum(["TEXT", "NUMBER", "BOOLEAN", "DROPDOWN", "MULTI_SELECT"])

const slugSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const categoryTemplateSchema = z.object({
	name: z.string().trim().min(1).max(120),
	slug: slugSchema,
	description: z.string().trim().max(500).optional().nullable(),
	imageUrl: z.string().trim().url().optional().nullable(),
	displayOrder: z.number().int().min(0).max(10000).optional().default(0),
	active: z.boolean().optional().default(true),
})

export const storeTypeSchema = z.object({
	name: z.string().trim().min(1).max(120),
	slug: slugSchema,
	description: z.string().trim().max(500).optional().nullable(),
	active: z.boolean().optional().default(true),
})

export const attributeDefinitionCreateSchema = z.object({
	name: z.string().trim().min(1).max(120),
	key: z.string().trim().min(1).max(80).regex(/^[a-z][a-z0-9_]*$/),
	type: productAttributeTypeSchema,
	required: z.boolean().optional().default(false),
	options: z.array(z.string().trim().min(1).max(120)).max(100).optional().default([]),
	displayOrder: z.number().int().min(0).max(10000).optional().default(0),
	active: z.boolean().optional().default(true),
})

export const industryCreateSchema = z.object({
	name: z.string().trim().min(2).max(120),
	slug: slugSchema,
	description: z.string().trim().max(500).optional().nullable(),
	icon: z.string().trim().max(80).optional().nullable(),
	active: z.boolean().optional().default(true),
	homepagePreset: z.record(z.string(), z.unknown()).optional(),
	defaultThemeId: z.string().trim().min(2).optional().nullable(),
	categoryTemplates: z.array(categoryTemplateSchema).max(200).optional(),
	attributeDefinitions: z.array(attributeDefinitionCreateSchema).max(200).optional(),
	storeTypes: z.array(storeTypeSchema).max(50).optional(),
})

export const industryPatchSchema = industryCreateSchema.partial()

export const attributeDefinitionPatchSchema = attributeDefinitionCreateSchema.partial()

export const themeCreateSchema = z.object({
	name: z.string().trim().min(2).max(120),
	slug: slugSchema,
	industryId: z.string().trim().min(2).optional().nullable(),
	colors: z.record(z.string(), z.string().trim().regex(/^#[0-9a-f]{6}$/i, "Colors must use six digit hex values")),
	typography: z.record(z.string(), z.string().trim().min(1).max(100)),
	heroLayout: z.string().trim().max(80).optional().nullable(),
	bannerStyle: z.string().trim().max(80).optional().nullable(),
	productGridStyle: z.string().trim().max(80).optional().nullable(),
	active: z.boolean().optional().default(true),
})

export const themePatchSchema = themeCreateSchema.partial()
