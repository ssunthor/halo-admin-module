import json

files_to_track = [
    "/ai/halo_admin_module/rest_api/routers/docs.py",
    "/ai/halo_admin_module/ui/src/features/documentation/components/HaloDocAccordion.jsx",
    "/ai/halo_admin_module/requirements.txt",
    "/ai/halo_admin_module/ui/package.json"
]

transcript_path = "/home/keckama/.gemini/antigravity-ide/brain/df26eb9e-938a-4caa-a2db-6e22c6fed9e8/.system_generated/logs/transcript_full.jsonl"
with open(transcript_path, 'r') as f:
    for line in f:
        data = json.loads(line)
        if data.get("type") == "PLANNER_RESPONSE":
            for tool_call in data.get("tool_calls", []):
                name = tool_call["name"]
                if name in ["replace_file_content", "multi_replace_file_content"]:
                    args = tool_call["args"]
                    target_file = args.get("TargetFile")
                    if target_file in files_to_track:
                        with open(target_file, "r") as tf:
                            content = tf.read()
                        
                        if name == "replace_file_content":
                            chunks = [{"TargetContent": args["TargetContent"], "ReplacementContent": args["ReplacementContent"]}]
                        else:
                            chunks = args.get("ReplacementChunks", [])
                            
                        for chunk in chunks:
                            target = chunk["TargetContent"]
                            replacement = chunk["ReplacementContent"]
                            if target in content:
                                content = content.replace(target, replacement)
                            else:
                                print(f"WARNING: Target not found in {target_file}")
                                
                        with open(target_file, "w") as tf:
                            tf.write(content)
                        print(f"Applied patch to {target_file}")
