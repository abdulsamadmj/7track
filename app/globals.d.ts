declare module "*.css";

declare module "*.graphql?raw" {
  const content: string;
  export default content;
}
