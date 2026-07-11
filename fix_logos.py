import os
from PIL import Image

def fix_logo(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # If pixel is very dark (background) but not the logo part.
            # Most of these brands have white logos on dark backgrounds.
            # We want to keep white/light pixels and make dark/checkerboard pixels transparent.
            
            # Threshold for "dark" background to be transparent
            # R, G, B channels
            avg = (item[0] + item[1] + item[2]) / 3
            if avg < 200: # If it's not white-ish (logo), make it transparent
                newData.append((0, 0, 0, 0))
            else:
                # Make the logo pure white for consistency
                newData.append((255, 255, 255, 255))

        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Saved to {output_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

def main():
    brands_dir = "public/brands"
    target_brands = ["dior.png", "valentino.png", "zimmermann.png", "ralph_lauren.png"]
    
    for filename in target_brands:
        path = os.path.join(brands_dir, filename)
        if os.path.exists(path):
            fix_logo(path, path)
        else:
            print(f"File {path} not found.")

if __name__ == "__main__":
    main()
