# blend
magick $IM1 -set option:dims "%wx%h" $IM2 -resize "%[dims]" -compose Screen -composite $OUT

# slow top bottom transition (these should be one line but are split up for clarity)

magick \( \( $IM1[0] -set option:dims "%wx%h" \) \( +clone \( +clone -alpha extract -colorspace gray \) \( -size %[dims] gradient: \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       \( \( $IM2[0] -resize %[dims] \) \( +clone \( +clone -alpha extract -colorspace gray \) \( -size %[dims] -define gradient:angle=0 gradient: \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       -compose Screen -composite $OUT

# fast top bottom transition

magick \( \( $IM1[0] -set option:dims "%wx%h" \) \( +clone \( +clone -alpha extract -colorspace gray \) \( -size %[dims] gradient: -level 35%,65% \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       \( \( $IM2[0] -resize %[dims] \) \( +clone \( +clone -alpha extract -colorspace gray \) \( -size %[dims] -define gradient:angle=0 gradient: -level 35%,65% \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       -compose Screen -composite $OUT

# slow left right transition

magick \( \( $IM1[0] -set option:dims "%wx%h" \) \( +clone \( +clone -alpha extract -colorspace gray \) \( -size %[dims] -define gradient:angle=90 gradient: \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       \( \( $IM2[0] -resize %[dims] \) \( +clone \( +clone -alpha extract -colorspace gray \) \( -size %[dims] -define gradient:angle=270 gradient: \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       -compose Screen -composite $OUT

# fast left right transition

magick \( \( $IM1[0] -set option:dims "%wx%h" \) \( +clone \( +clone -alpha extract -colorspace gray \) \( -size %[dims] -define gradient:angle=90 gradient: -level 35%,65% \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       \( \( $IM2[0] -resize %[dims] \) \( +clone \( +clone -alpha extract -colorspace gray \) \( -size %[dims] -define gradient:angle=270 gradient: -level 35%,65% \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       -compose Screen -composite $OUT

# checkerboard transition

magick \( \( $IM1[0] -set option:dims "%wx%h" \) \( +clone \( +clone -alpha extract -colorspace gray \) \( -size %[dims] pattern:checkerboard -auto-level \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       \( \( $IM2[0] -resize %[dims] \) \( +clone \( +clone -alpha extract -colorspace gray \) \( -size %[dims] pattern:checkerboard -auto-level -negate \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       -compose Screen -composite $OUT

# slats transition

magick \( \( $IM1[0] -set option:dims "%wx%h" \) \( +clone \( +clone -alpha extract -colorspace gray \) \( example_mask.png -resize %[dims] \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       \( \( $IM2[0] -resize %[dims] \) \( +clone \( +clone -alpha extract -colorspace gray \) \( example_mask.png -resize %[dims] -negate \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite \)
       -compose Screen -composite $OUT


# notes ===================================

# alpha over

magick $IM1 -set option:dims "%wx%h" -size %[dims] gradient: -compose CopyOpacity -composite $OUT

# making a masked image (half of the above blend modes)

#        |---------------------------------------------------------------------------------------------------------- alpha blended first image ----------------------------------------------------------|
#                                           |----------                   combined alpha mask      ---------------------------------------------------------------------|
#            first image                                      alpha channel                               gradient mask
magick \( $IM1 -set option:dims "%wx%h" \) \( +clone \( +clone -alpha extract -colorspace gray \) \( -size %[dims] gradient: \) -compose Multiply -delete 0 -composite \) -compose CopyOpacity -composite $OUT
