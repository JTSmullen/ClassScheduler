package com.classScheduler.app.seeder;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import java.io.IOException;
import java.io.InputStream;

public class CourseReqReader {
    private static final String PDF_RESOURCE = "/Physics-Computer Software Major Requirements.pdf";

    public static void main(String[] args) {
        try (InputStream pdfStream = CourseReqReader.class.getResourceAsStream(PDF_RESOURCE)) {
            if (pdfStream == null) {
                System.err.println("Could not find PDF resource: " + PDF_RESOURCE);
                System.err.println("Make sure the file exists under src/main/resources and is on the runtime classpath.");
                return;
            }

            try (PDDocument document = Loader.loadPDF(pdfStream.readAllBytes())) {
                System.out.println("Loaded PDF resource: " + PDF_RESOURCE);
                System.out.println("Page count: " + document.getNumberOfPages());

            PDFTextStripper stripper = new PDFTextStripper();
                String text = stripper.getText(document);
                int textLength = text == null ? 0 : text.trim().length();

                System.out.println("Extracted text length: " + textLength);

                if (textLength == 0) {
                    System.out.println("No extractable text was found in the PDF.");
                    System.out.println("This usually means the PDF is image-based or scanned and needs OCR.");
                    return;
                }

                System.out.println("---- Extracted Text Preview ----");
                System.out.println(text);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
