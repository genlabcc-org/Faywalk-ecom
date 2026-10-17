// supabase/functions/global.d.ts

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "npm:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "@supabase/server" {
  export function withSupabase(config: any, handler: any): any;
}
