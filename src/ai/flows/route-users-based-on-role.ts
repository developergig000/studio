'use server';
/**
 * @fileOverview A flow that determines the correct dashboard route for a user based on their role.
 *
 * - routeUsersBasedOnRole - A function that accepts a user role and returns the appropriate dashboard route.
 * - RouteUsersBasedOnRoleInput - The input type for the routeUsersBasedOnRole function.
 * - RouteUsersBasedOnRoleOutput - The return type for the routeUsersBasedOnRole function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RouteUsersBasedOnRoleInputSchema = z.object({
  role: z.string().describe('The role of the user (e.g., HEAD_SALES, SALES).'),
});
export type RouteUsersBasedOnRoleInput = z.infer<typeof RouteUsersBasedOnRoleInputSchema>;

const RouteUsersBasedOnRoleOutputSchema = z.object({
  route: z.string().describe('The dashboard route for the user based on their role.'),
});
export type RouteUsersBasedOnRoleOutput = z.infer<typeof RouteUsersBasedOnRoleOutputSchema>;

export async function routeUsersBasedOnRole(input: RouteUsersBasedOnRoleInput): Promise<RouteUsersBasedOnRoleOutput> {
  return routeUsersBasedOnRoleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'routeUsersBasedOnRolePrompt',
  input: {schema: RouteUsersBasedOnRoleInputSchema},
  output: {schema: RouteUsersBasedOnRoleOutputSchema},
  prompt: `You are an expert system for determining user roles and dashboard routes.

  Based on the user's role, determine the correct dashboard route.

  User Role: {{{role}}}

  Return the dashboard route in the output. The dashboard routes are:
  - HEAD_SALES: /dashboard/head
  - SALES: /dashboard/sales`,
});

const routeUsersBasedOnRoleFlow = ai.defineFlow(
  {
    name: 'routeUsersBasedOnRoleFlow',
    inputSchema: RouteUsersBasedOnRoleInputSchema,
    outputSchema: RouteUsersBasedOnRoleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
